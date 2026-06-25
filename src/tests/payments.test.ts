import request from 'supertest'
import { createApp } from '../app'
import Category from '../models/Category'
import Product from '../models/Product'
import Order from '../models/Order'

// Mock del servicio MP para no depender de red ni credenciales
jest.mock('../services/payment/mercadopago.service', () => ({
  createPreference: jest.fn().mockResolvedValue({
    preferenceId: 'MOCK_PREF_ID_123',
    init_point: 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=MOCK_PREF_ID_123',
  }),
  getPayment: jest.fn(),
}))

// Mock del servicio WebPay para no depender de red ni credenciales
jest.mock('../services/payment/webpay.service', () => ({
  initWebpay: jest.fn().mockResolvedValue({
    token: 'MOCK_WEBPAY_TOKEN_ABC123',
    url: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction',
  }),
  commitWebpay: jest.fn(),
}))

import { getPayment } from '../services/payment/mercadopago.service'
import { commitWebpay } from '../services/payment/webpay.service'

const app = createApp()
const SESSION_ID = 'payments-test-session-uuid-9999'
const WP_SESSION_ID = 'webpay-test-session-uuid-8888'

let productId: string
let orderId: string
let orderNumber: string
let wpOrderId: string
let wpOrderNumber: string

const PICKUP_ORDER = {
  customerData: { name: 'Test User', email: 'test@americo.cl' },
  fulfillmentData: { type: 'pickup', shippingCost: 0 },
  paymentMethod: 'mercadopago',
}

const WP_ORDER = {
  customerData: { name: 'Webpay User', email: 'webpay@americo.cl' },
  fulfillmentData: { type: 'pickup', shippingCost: 0 },
  paymentMethod: 'webpay',
}

beforeEach(async () => {
  const cat = await Category.create({ name: 'Bebidas', slug: 'bebidas', sortOrder: 1 })
  const product = await Product.create({
    name: 'Agua Mineral', slug: 'agua-mineral', sku: 'SKU-AGUA', price: 500,
    category: cat._id, stock: 10, unit: 'lt',
  })
  productId = String(product._id)

  // Poblar carrito MP
  await request(app)
    .post('/api/v1/cart/items')
    .set('x-session-id', SESSION_ID)
    .send({ productId, quantity: 2 })

  // Crear orden de tipo mercadopago
  const res = await request(app)
    .post('/api/v1/orders')
    .set('x-session-id', SESSION_ID)
    .send(PICKUP_ORDER)

  orderId = res.body.data.orderId
  orderNumber = res.body.data.orderNumber
})

describe('Payments — MercadoPago init', () => {
  it('POST /api/v1/payments/mp/init — retorna preferenceId e init_point', async () => {
    const res = await request(app)
      .post('/api/v1/payments/mp/init')
      .send({ orderId })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.preferenceId).toBe('MOCK_PREF_ID_123')
    expect(res.body.data.init_point).toContain('mercadopago.com')
  })

  it('POST /api/v1/payments/mp/init — 404 para orderId inexistente', async () => {
    const res = await request(app)
      .post('/api/v1/payments/mp/init')
      .send({ orderId: '000000000000000000000000' })

    expect(res.status).toBe(404)
  })

  it('POST /api/v1/payments/mp/init — 400 sin orderId', async () => {
    const res = await request(app)
      .post('/api/v1/payments/mp/init')
      .send({})

    expect(res.status).toBe(400)
  })

  it('POST /api/v1/payments/mp/init — 400 si orden ya fue procesada', async () => {
    // Simular que ya se procesó la orden
    await Order.findByIdAndUpdate(orderId, { status: 'payment_confirmed' })

    const res = await request(app)
      .post('/api/v1/payments/mp/init')
      .send({ orderId })

    expect(res.status).toBe(400)
  })
})

describe('Payments — MercadoPago webhook', () => {
  it('POST /api/v1/payments/mp/webhook — pago aprobado actualiza orden a payment_confirmed', async () => {
    ;(getPayment as jest.Mock).mockResolvedValue({
      id: 123456,
      status: 'approved',
      external_reference: orderNumber,
      transaction_amount: 1000,
      date_approved: new Date().toISOString(),
    })

    const res = await request(app)
      .post('/api/v1/payments/mp/webhook')
      .send({ type: 'payment', data: { id: '123456' } })

    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)

    // Esperar procesamiento asíncrono post-respuesta
    await new Promise((r) => setTimeout(r, 100))

    const updated = await Order.findById(orderId)
    expect(updated?.status).toBe('payment_confirmed')
    expect(updated?.payment.status).toBe('paid')
    expect(updated?.payment.transactionId).toBe('123456')
  })

  it('POST /api/v1/payments/mp/webhook — pago rechazado cancela la orden', async () => {
    ;(getPayment as jest.Mock).mockResolvedValue({
      id: 789,
      status: 'rejected',
      external_reference: orderNumber,
      transaction_amount: 1000,
    })

    await request(app)
      .post('/api/v1/payments/mp/webhook')
      .send({ type: 'payment', data: { id: '789' } })

    await new Promise((r) => setTimeout(r, 100))

    const updated = await Order.findById(orderId)
    expect(updated?.status).toBe('cancelled')
    expect(updated?.payment.status).toBe('failed')
  })

  it('POST /api/v1/payments/mp/webhook — ignora eventos sin paymentId', async () => {
    const res = await request(app)
      .post('/api/v1/payments/mp/webhook')
      .send({ type: 'merchant_order', data: { id: '999' } })

    expect(res.status).toBe(200)

    await new Promise((r) => setTimeout(r, 100))

    // Orden no debe cambiar
    const updated = await Order.findById(orderId)
    expect(updated?.status).toBe('pending_payment')
  })
})

describe('Payments — WebPay init', () => {
  beforeEach(async () => {
    // Poblar carrito WebPay (usa productId creado por el beforeEach externo)
    await request(app)
      .post('/api/v1/cart/items')
      .set('x-session-id', WP_SESSION_ID)
      .send({ productId, quantity: 1 })

    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', WP_SESSION_ID)
      .send(WP_ORDER)

    wpOrderId = res.body.data.orderId
    wpOrderNumber = res.body.data.orderNumber
  })

  it('POST /api/v1/payments/webpay/init — retorna token y url', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webpay/init')
      .send({ orderId: wpOrderId })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBe('MOCK_WEBPAY_TOKEN_ABC123')
    expect(res.body.data.url).toContain('transbank')
  })

  it('POST /api/v1/payments/webpay/init — 404 para orderId inexistente', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webpay/init')
      .send({ orderId: '000000000000000000000000' })

    expect(res.status).toBe(404)
  })

  it('POST /api/v1/payments/webpay/init — 400 sin orderId', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webpay/init')
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('Payments — WebPay confirm', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/cart/items')
      .set('x-session-id', WP_SESSION_ID)
      .send({ productId, quantity: 1 })

    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', WP_SESSION_ID)
      .send(WP_ORDER)

    wpOrderId = res.body.data.orderId
    wpOrderNumber = res.body.data.orderNumber
  })

  it('POST /api/v1/payments/webpay/confirm — pago aprobado actualiza orden y redirige a approved', async () => {
    ;(commitWebpay as jest.Mock).mockResolvedValue({
      approved: true,
      orderNumber: wpOrderNumber,
      authCode: 'AUTH123456',
      amount: 500,
      gatewayResponse: {},
    })

    const res = await request(app)
      .post('/api/v1/payments/webpay/confirm')
      .type('form')
      .send({ token_ws: 'MOCK_TOKEN_WS' })

    expect(res.status).toBe(302)
    expect(res.header.location).toContain('status=approved')
    expect(res.header.location).toContain(wpOrderNumber)

    const updated = await Order.findById(wpOrderId)
    expect(updated?.status).toBe('payment_confirmed')
    expect(updated?.payment.status).toBe('paid')
    expect(updated?.payment.transactionId).toBe('AUTH123456')
  })

  it('POST /api/v1/payments/webpay/confirm — pago rechazado cancela la orden y redirige a rejected', async () => {
    ;(commitWebpay as jest.Mock).mockResolvedValue({
      approved: false,
      orderNumber: wpOrderNumber,
      gatewayResponse: {},
    })

    const res = await request(app)
      .post('/api/v1/payments/webpay/confirm')
      .type('form')
      .send({ token_ws: 'MOCK_TOKEN_WS' })

    expect(res.status).toBe(302)
    expect(res.header.location).toContain('status=rejected')

    const updated = await Order.findById(wpOrderId)
    expect(updated?.status).toBe('cancelled')
    expect(updated?.payment.status).toBe('failed')
  })

  it('POST /api/v1/payments/webpay/confirm — cancelación (TBK_TOKEN) cancela la orden y redirige a rejected', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webpay/confirm')
      .type('form')
      .send({ TBK_TOKEN: 'SOME_TBK_TOKEN', TBK_ORDEN_COMPRA: wpOrderNumber, TBK_ID_SESION: wpOrderNumber })

    expect(res.status).toBe(302)
    expect(res.header.location).toContain('status=rejected')
    expect(res.header.location).toContain(wpOrderNumber)

    const updated = await Order.findById(wpOrderId)
    expect(updated?.status).toBe('cancelled')
  })
})
