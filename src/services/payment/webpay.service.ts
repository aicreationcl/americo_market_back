import { WebpayPlus, IntegrationApiKeys, IntegrationCommerceCodes } from 'transbank-sdk'
import { config } from '../../config'
import { IOrder } from '../../models/Order'

const getTransaction = () => {
  if (config.WEBPAY_ENV === 'production' && config.WEBPAY_COMMERCE_CODE && config.WEBPAY_API_KEY) {
    return WebpayPlus.Transaction.buildForProduction(config.WEBPAY_COMMERCE_CODE, config.WEBPAY_API_KEY)
  }
  return WebpayPlus.Transaction.buildForIntegration(
    IntegrationCommerceCodes.WEBPAY_PLUS,
    IntegrationApiKeys.WEBPAY
  )
}

export interface WebpayInitResult {
  token: string
  url: string
}

export interface WebpayCommitResult {
  approved: boolean
  orderNumber: string
  authCode?: string
  amount?: number
  cardLast4?: string
  gatewayResponse?: unknown
}

export const initWebpay = async (order: IOrder): Promise<WebpayInitResult> => {
  const tx = getTransaction()
  const returnUrl = `${config.BACKEND_URL}/api/v1/payments/webpay/confirm`
  const response = await tx.create(order.orderNumber, order.orderNumber, order.total, returnUrl)
  return { token: response.token as string, url: response.url as string }
}

export const commitWebpay = async (tokenWs: string): Promise<WebpayCommitResult> => {
  const tx = getTransaction()
  const response = await tx.commit(tokenWs)
  const approved = response.response_code === 0 && response.status === 'AUTHORIZED'
  return {
    approved,
    orderNumber: (response.buy_order as string) ?? '',
    authCode: response.authorization_code as string | undefined,
    amount: response.amount as number | undefined,
    cardLast4: response.card_detail?.card_number as string | undefined,
    gatewayResponse: response as unknown,
  }
}
