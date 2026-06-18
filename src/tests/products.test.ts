import request from 'supertest'
import { createApp } from '../app'
import Category from '../models/Category'
import Product from '../models/Product'

const app = createApp()

let categoryId: string
let adminToken: string

const adminUser = { name: 'Admin', email: 'admin@americo.cl', password: 'admin123' }

beforeEach(async () => {
  const reg = await request(app).post('/api/v1/auth/register').send(adminUser)
  adminToken = reg.body.data.accessToken

  // Upgrade to admin directly via model
  const User = (await import('../models/User')).default
  await User.findOneAndUpdate({ email: adminUser.email }, { role: 'admin' })

  const cat = await Category.create({
    name: 'Despensa',
    slug: 'despensa',
    description: 'Productos de despensa',
    sortOrder: 1,
  })
  categoryId = String(cat._id)
})

describe('GET /api/v1/products', () => {
  it('should return paginated products', async () => {
    await Product.create([
      { name: 'Arroz 1kg', slug: 'arroz-1kg', sku: 'SKU001', price: 1490, category: categoryId, stock: 50, unit: 'kg' },
      { name: 'Fideos 400g', slug: 'fideos-400g', sku: 'SKU002', price: 990, category: categoryId, stock: 30, unit: 'paq' },
    ])

    const res = await request(app).get('/api/v1/products')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
    expect(res.body.pagination.total).toBe(2)
  })

  it('should filter by category slug', async () => {
    await Product.create({
      name: 'Arroz 1kg', slug: 'arroz-1kg', sku: 'SKU001', price: 1490, category: categoryId, stock: 50, unit: 'kg',
    })

    const res = await request(app).get('/api/v1/products?category=despensa')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  it('should only return active products', async () => {
    await Product.create([
      { name: 'Activo', slug: 'activo', sku: 'SKU003', price: 1000, category: categoryId, stock: 10, unit: 'un', isActive: true },
      { name: 'Inactivo', slug: 'inactivo', sku: 'SKU004', price: 1000, category: categoryId, stock: 10, unit: 'un', isActive: false },
    ])

    const res = await request(app).get('/api/v1/products')
    expect(res.body.data.every((p: { isActive: boolean }) => p.isActive)).toBe(true)
  })
})

describe('GET /api/v1/products/:slug', () => {
  it('should return product by slug', async () => {
    await Product.create({ name: 'Arroz', slug: 'arroz', sku: 'SKU005', price: 1490, category: categoryId, stock: 50, unit: 'kg' })
    const res = await request(app).get('/api/v1/products/arroz')
    expect(res.status).toBe(200)
    expect(res.body.data.slug).toBe('arroz')
  })

  it('should return 404 for unknown slug', async () => {
    const res = await request(app).get('/api/v1/products/no-existe')
    expect(res.status).toBe(404)
  })
})
