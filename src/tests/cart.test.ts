import request from 'supertest'
import { createApp } from '../app'
import Category from '../models/Category'
import Product from '../models/Product'

const app = createApp()

const SESSION_ID = 'test-session-uuid-1234'
let productId: string

beforeEach(async () => {
  const cat = await Category.create({ name: 'Despensa', slug: 'despensa', sortOrder: 1 })
  const product = await Product.create({
    name: 'Arroz', slug: 'arroz', sku: 'SKU001', price: 1490,
    category: cat._id, stock: 50, unit: 'kg',
  })
  productId = String(product._id)
})

describe('Cart endpoints (guest)', () => {
  it('GET /api/v1/cart — creates empty cart for new session', async () => {
    const res = await request(app).get('/api/v1/cart').set('x-session-id', SESSION_ID)
    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(0)
  })

  it('POST /api/v1/cart/items — adds item to cart', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('x-session-id', SESSION_ID)
      .send({ productId, quantity: 2 })
    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(1)
    expect(res.body.data.items[0].quantity).toBe(2)
    expect(res.body.data.items[0].price).toBe(1490)
  })

  it('PATCH /api/v1/cart/items/:productId — updates quantity', async () => {
    await request(app)
      .post('/api/v1/cart/items')
      .set('x-session-id', SESSION_ID)
      .send({ productId, quantity: 1 })

    const res = await request(app)
      .patch(`/api/v1/cart/items/${productId}`)
      .set('x-session-id', SESSION_ID)
      .send({ quantity: 3 })
    expect(res.status).toBe(200)
    expect(res.body.data.items[0].quantity).toBe(3)
  })

  it('DELETE /api/v1/cart/items/:productId — removes item', async () => {
    await request(app)
      .post('/api/v1/cart/items')
      .set('x-session-id', SESSION_ID)
      .send({ productId, quantity: 1 })

    const res = await request(app)
      .delete(`/api/v1/cart/items/${productId}`)
      .set('x-session-id', SESSION_ID)
    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(0)
  })

  it('rejects adding more than available stock', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('x-session-id', SESSION_ID)
      .send({ productId, quantity: 9999 })
    expect(res.status).toBe(400)
  })
})
