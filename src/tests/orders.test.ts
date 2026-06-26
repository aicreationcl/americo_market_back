import request from 'supertest'
import { createApp } from '../app'
import Category from '../models/Category'
import Product from '../models/Product'

const app = createApp()

const SESSION_ID = 'order-test-session-uuid-5678'
let productId: string

beforeEach(async () => {
  const cat = await Category.create({ name: 'Despensa', slug: 'despensa', sortOrder: 1 })
  const product = await Product.create({
    name: 'Leche', slug: 'leche', sku: 'SKU002', price: 990,
    category: cat._id, stock: 20, unit: 'lt',
  })
  productId = String(product._id)

  // Populate cart for guest session
  await request(app)
    .post('/api/v1/cart/items')
    .set('x-session-id', SESSION_ID)
    .send({ productId, quantity: 3 })
})

const PICKUP_ORDER = {
  customerData: { name: 'Juan Pérez', email: 'juan@test.cl', phone: '+56912345678' },
  fulfillmentData: { type: 'pickup', shippingCost: 0 },
}

describe('Orders — guest checkout (pickup)', () => {
  it('POST /api/v1/orders — creates order from guest cart', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', SESSION_ID)
      .send(PICKUP_ORDER)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.orderNumber).toMatch(/^AME-\d{4}-\d{5}$/)
    expect(res.body.data.total).toBe(990 * 3)
  })

  it('POST /api/v1/orders — decrements product stock', async () => {
    await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', SESSION_ID)
      .send(PICKUP_ORDER)

    const product = await Product.findById(productId)
    expect(product!.stock).toBe(20 - 3)
  })

  it('POST /api/v1/orders — clears cart after order', async () => {
    await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', SESSION_ID)
      .send(PICKUP_ORDER)

    const cartRes = await request(app)
      .get('/api/v1/cart')
      .set('x-session-id', SESSION_ID)
    expect(cartRes.body.data.items).toHaveLength(0)
  })

  it('POST /api/v1/orders — rejects empty cart', async () => {
    // Clear the cart first
    await request(app).delete('/api/v1/cart').set('x-session-id', SESSION_ID)

    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', SESSION_ID)
      .send(PICKUP_ORDER)

    expect(res.status).toBe(400)
  })

  it('POST /api/v1/orders — rejects insufficient stock', async () => {
    // Add more than available stock
    await request(app)
      .patch(`/api/v1/cart/items/${productId}`)
      .set('x-session-id', SESSION_ID)
      .send({ quantity: 999 })

    // Directly update stock to force the scenario
    await Product.findByIdAndUpdate(productId, { stock: 1 })

    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', SESSION_ID)
      .send(PICKUP_ORDER)

    expect(res.status).toBe(400)
  })
})

describe('Orders — tracking', () => {
  it('GET /api/v1/orders/track/:orderNumber — returns order by number', async () => {
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('x-session-id', SESSION_ID)
      .send(PICKUP_ORDER)

    const { orderNumber } = orderRes.body.data

    const res = await request(app).get(`/api/v1/orders/track/${orderNumber}`)
    expect(res.status).toBe(200)
    expect(res.body.data.orderNumber).toBe(orderNumber)
    expect(res.body.data.status).toBe('pending_payment')
    expect(res.body.data.total).toBe(990 * 3)
    expect(res.body.data.customer.name).toBe('Juan Pérez')
  })

  it('GET /api/v1/orders/track/:orderNumber — 404 for unknown number', async () => {
    const res = await request(app).get('/api/v1/orders/track/AME-9999-99999')
    expect(res.status).toBe(404)
  })
})
