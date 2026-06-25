import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../app'
import User from '../models/User'
import Category from '../models/Category'
import Product from '../models/Product'
import Order from '../models/Order'

const app = createApp()

let adminToken: string
let categoryId: string
let productId: string

beforeEach(async () => {
  // Create admin user directly (register endpoint sets role: customer)
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await User.create({
    name: 'Admin Test',
    email: 'admin@americo.cl',
    passwordHash,
    role: 'admin',
  })

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@americo.cl', password: 'admin123' })
  adminToken = loginRes.body.data.accessToken

  const cat = await Category.create({ name: 'Lácteos', slug: 'lacteos', sortOrder: 1 })
  categoryId = String(cat._id)

  const product = await Product.create({
    name: 'Leche Entera',
    slug: 'leche-entera',
    sku: 'SKU-LECHE',
    price: 1200,
    category: cat._id,
    stock: 50,
    unit: 'lt',
  })
  productId = String(product._id)

  // Paid delivery order (La Pintana)
  await Order.create({
    orderNumber: 'AME-TEST-00001',
    customer: { name: 'Ana García', email: 'ana@test.cl' },
    items: [{ product: product._id, name: 'Leche Entera', sku: 'SKU-LECHE', price: 1200, quantity: 2, imageUrl: '', subtotal: 2400 }],
    subtotal: 2400,
    shippingCost: 2000,
    discount: 0,
    total: 4400,
    fulfillment: { type: 'delivery', address: { commune: 'La Pintana', region: 'Región Metropolitana' } },
    status: 'delivered',
    payment: { method: 'webpay', status: 'paid' },
    statusHistory: [],
  })

  // Paid pickup order (no commune impact)
  await Order.create({
    orderNumber: 'AME-TEST-00002',
    customer: { name: 'Luis Torres', email: 'luis@test.cl' },
    items: [{ product: product._id, name: 'Leche Entera', sku: 'SKU-LECHE', price: 1200, quantity: 1, imageUrl: '', subtotal: 1200 }],
    subtotal: 1200,
    shippingCost: 0,
    discount: 0,
    total: 1200,
    fulfillment: { type: 'pickup', pickupStore: { name: 'Tienda', address: 'Sgto. Daniel Rebolledo 0739' } },
    status: 'delivered',
    payment: { method: 'cash_on_pickup', status: 'paid' },
    statusHistory: [],
  })

  // Unpaid order — should NOT count toward revenue
  await Order.create({
    orderNumber: 'AME-TEST-00003',
    customer: { name: 'Carla Ruiz', email: 'carla@test.cl' },
    items: [{ product: product._id, name: 'Leche Entera', sku: 'SKU-LECHE', price: 1200, quantity: 3, imageUrl: '', subtotal: 3600 }],
    subtotal: 3600,
    shippingCost: 0,
    discount: 0,
    total: 3600,
    fulfillment: { type: 'pickup' },
    status: 'pending_payment',
    payment: { method: 'mercadopago', status: 'pending' },
    statusHistory: [],
  })
})

describe('Admin analytics', () => {
  it('GET /api/v1/admin/analytics — returns 200 with correct structure', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const { data } = res.body
    expect(typeof data.revenueToday).toBe('number')
    expect(typeof data.revenueThisMonth).toBe('number')
    expect(Array.isArray(data.topProducts)).toBe(true)
    expect(Array.isArray(data.topCategories)).toBe(true)
    expect(Array.isArray(data.topCommunes)).toBe(true)
  })

  it('revenueThisMonth — only counts paid orders', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    // Paid orders: 4400 (delivery) + 1200 (pickup) = 5600. Unpaid (3600) excluded.
    expect(res.body.data.revenueThisMonth).toBe(5600)
  })

  it('topCommunes — only includes delivery orders', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const { topCommunes } = res.body.data
    // Only the delivery order to La Pintana should appear
    expect(topCommunes.length).toBeGreaterThanOrEqual(1)
    expect(topCommunes[0].commune).toBe('La Pintana')
    expect(topCommunes[0].orderCount).toBe(1)
    // pickup order should not appear
    expect(topCommunes.some((c: { commune: string }) => c.commune === undefined)).toBe(false)
  })

  it('topProducts — aggregates sold quantities and revenue', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const { topProducts } = res.body.data
    expect(topProducts.length).toBeGreaterThanOrEqual(1)
    const leche = topProducts.find((p: { name: string }) => p.name === 'Leche Entera')
    expect(leche).toBeDefined()
    // 3 orders × quantities: 2 + 1 + 3 = 6 units, revenue: 2400 + 1200 + 3600 = 7200
    expect(leche.totalSold).toBe(6)
    expect(leche.revenue).toBe(7200)
  })

  it('GET /api/v1/admin/analytics — 401 without token', async () => {
    const res = await request(app).get('/api/v1/admin/analytics')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/admin/analytics — 403 for non-admin user', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Cliente', email: 'cliente@test.cl', password: 'pass1234' })
    const customerToken = reg.body.data.accessToken

    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${customerToken}`)
    expect(res.status).toBe(403)
  })
})
