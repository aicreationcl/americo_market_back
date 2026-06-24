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

import { getPayment } from '../services/payment/mercadopago.service'

const app = createApp()
const SESSION_ID = 'payments-test-session-uuid-9999'
let productId: string
let orderId: string
let orderNumber: string

const PICKUP_ORDER = {
  customerData: { name: 'Test User', email: 'test@americo.cl' },
  fulfillmentData: { type: 'pickup', shippingCost: 0 },
  paymentMethod: 'mercadopago',
}

beforeEach(async () => {
  const cat = await Category.create({ name: 'Bebidas', slug: 'bebidas', sortOrder: 1 })
  const product = await Product.create({
    name: 'Agua Mineral', slug: 'agua-mineral', sku: 'SKU-AGUA', price: 500,
    category: cat._id, stock: 10, unit: 'lt',
  })
  productId = String(product._id)

  // Poblar carrito
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
