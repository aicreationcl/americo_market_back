import { Request, Response } from 'express'
import Order from '../models/Order'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { createPreference, getPayment } from '../services/payment/mercadopago.service'
import { sendOrderConfirmation, sendNewOrderNotification } from '../services/email.service'

// POST /api/v1/payments/mp/init
export const mpInit = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body as { orderId: string }
  if (!orderId) throw new ApiError(400, 'orderId es requerido')

  const order = await Order.findById(orderId)
  if (!order) throw new ApiError(404, 'Orden no encontrada')
  if (order.payment.method !== 'mercadopago') throw new ApiError(400, 'Esta orden no es de tipo MercadoPago')
  if (order.status !== 'pending_payment') throw new ApiError(400, 'La orden ya fue procesada')

  const { preferenceId, init_point } = await createPreference(order)
  res.json({ success: true, data: { preferenceId, init_point } })
})

// POST /api/v1/payments/mp/webhook  — IPN de MercadoPago
export const mpWebhook = asyncHandler(async (req: Request, res: Response) => {
  // Responder 200 inmediatamente — MP requiere respuesta rápida
  res.status(200).json({ received: true })

  try {
    const body = req.body as Record<string, unknown>

    // MP envía { type: 'payment', data: { id: '...' } } o { action: 'payment.updated', data: { id: '...' } }
    const isPaymentEvent = body.type === 'payment' || body.action === 'payment.updated'
    const paymentId = isPaymentEvent && body.data
      ? ((body.data as Record<string, unknown>).id as string | undefined)
      : undefined

    if (!paymentId) return

    const mpPayment = await getPayment(paymentId)
    if (!mpPayment.external_reference) return

    const order = await Order.findOne({ orderNumber: mpPayment.external_reference })
    if (!order || order.status !== 'pending_payment') return

    if (mpPayment.status === 'approved') {
      order.status = 'payment_confirmed'
      order.payment.status = 'paid'
      order.payment.transactionId = String(mpPayment.id)
      order.payment.paidAt = mpPayment.date_approved ? new Date(mpPayment.date_approved) : new Date()
      order.payment.gatewayResponse = mpPayment as unknown
      order.statusHistory.push({
        status: 'payment_confirmed',
        changedAt: new Date(),
        note: 'Pago aprobado por MercadoPago',
      })
      await order.save()
      Promise.all([
        sendOrderConfirmation(order).catch(() => {}),
        sendNewOrderNotification(order).catch(() => {}),
      ])
    } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      order.status = 'cancelled'
      order.payment.status = 'failed'
      order.statusHistory.push({
        status: 'cancelled',
        changedAt: new Date(),
        note: `Pago ${mpPayment.status} por MercadoPago`,
      })
      await order.save()
    }
  } catch {
    // Errores en procesamiento post-respuesta no afectan al cliente
  }
})
