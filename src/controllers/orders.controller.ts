import { Request, Response } from 'express'
import Order from '../models/Order'
import { createOrder } from '../services/order.service'
import * as cartService from '../services/cart.service'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { sendOrderConfirmation, sendNewOrderNotification } from '../services/email.service'

export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  const { customerData, fulfillmentData, paymentMethod, notes } = req.body
  const sessionId = req.headers['x-session-id'] as string | undefined
  const userId = req.user?.id

  const cart = await cartService.getOrCreateCart(sessionId, userId)
  if (cart.items.length === 0) throw new ApiError(400, 'El carrito está vacío')

  const order = await createOrder({
    cartId: String(cart._id),
    userId,
    customerData,
    fulfillmentData,
    paymentMethod,
    notes,
  })

  // Para pagos digitales (webpay, mercadopago) los emails se envían en el webhook de confirmación
  const isDigitalPayment = order.payment.method === 'webpay' || order.payment.method === 'mercadopago'
  if (!isDigitalPayment) {
    Promise.all([
      sendOrderConfirmation(order).catch(() => {}),
      sendNewOrderNotification(order).catch(() => {}),
    ])
  }

  res.status(201).json({
    success: true,
    data: { orderId: order._id, orderNumber: order.orderNumber, total: order.total },
  })
})

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await Order.find({ 'customer.userId': req.user!.id })
    .sort({ createdAt: -1 })
    .select('orderNumber status total subtotal shippingCost fulfillment customer items createdAt')
  res.json({ success: true, data: orders })
})

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({
    _id: req.params.id,
    'customer.userId': req.user!.id,
  })
  if (!order) throw new ApiError(404, 'Pedido no encontrado')
  res.json({ success: true, data: order })
})

export const trackOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber }).select(
    'orderNumber status fulfillment.type fulfillment.estimatedDate statusHistory items.name items.quantity createdAt'
  )
  if (!order) throw new ApiError(404, 'Pedido no encontrado')
  res.json({ success: true, data: order })
})
