import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { config } from '../../config'
import { IOrder } from '../../models/Order'

let mpClient: MercadoPagoConfig | null = null

const getClient = (): MercadoPagoConfig => {
  if (!config.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado')
  }
  if (!mpClient) {
    mpClient = new MercadoPagoConfig({ accessToken: config.MERCADOPAGO_ACCESS_TOKEN })
  }
  return mpClient
}

export interface MPPreferenceResult {
  preferenceId: string
  init_point: string
}

export const createPreference = async (order: IOrder): Promise<MPPreferenceResult> => {
  const client = getClient()
  const preference = new Preference(client)

  const items = order.items.map((item) => ({
    id: String(item.product),
    title: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    currency_id: 'CLP',
  }))

  const resultUrl = `${config.FRONTEND_URL}/pago/resultado`
  const webhookUrl = `${config.BACKEND_URL}/api/v1/payments/mp/webhook`

  const result = await preference.create({
    body: {
      items,
      external_reference: order.orderNumber,
      back_urls: {
        success: `${resultUrl}?collection_status=approved&external_reference=${order.orderNumber}`,
        failure: `${resultUrl}?collection_status=rejected&external_reference=${order.orderNumber}`,
        pending: `${resultUrl}?collection_status=in_process&external_reference=${order.orderNumber}`,
      },
      auto_return: 'approved',
      notification_url: webhookUrl,
    },
  })

  if (!result.id || !result.init_point) {
    throw new Error('MercadoPago no retornó un preference válido')
  }

  return { preferenceId: result.id, init_point: result.init_point }
}

export interface MPPaymentData {
  id: number
  status: string
  external_reference: string
  transaction_amount: number
  date_approved?: string
}

export const getPayment = async (paymentId: string): Promise<MPPaymentData> => {
  const client = getClient()
  const payment = new Payment(client)
  const data = await payment.get({ id: Number(paymentId) })

  return {
    id: data.id ?? 0,
    status: data.status ?? 'unknown',
    external_reference: data.external_reference ?? '',
    transaction_amount: data.transaction_amount ?? 0,
    date_approved: data.date_approved ?? undefined,
  }
}
