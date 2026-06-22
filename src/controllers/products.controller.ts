import { Request, Response } from 'express'
import Product from '../models/Product'
import Category from '../models/Category'
import { ApiError } from '../utils/ApiError'
import asyncHandler from '../utils/asyncHandler'
import type { SortOrder } from 'mongoose'

const SORT_MAP: Record<string, Record<string, SortOrder>> = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
  newest: { createdAt: -1 },
}

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    category, search, minPrice, maxPrice,
    page = '1', limit = '24', sort = 'newest',
  } = req.query as Record<string, string>

  const filter: Record<string, unknown> = { isActive: true }

  if (category) {
    const cat = await Category.findOne({ slug: category, isActive: true })
    if (cat) filter.category = cat._id
  }
  if (search) filter.$text = { $search: search }
  if (minPrice || maxPrice) {
    filter.price = {
      ...(minPrice && { $gte: parseInt(minPrice) }),
      ...(maxPrice && { $lte: parseInt(maxPrice) }),
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const sortBy = SORT_MAP[sort] ?? { createdAt: -1 }

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sortBy).skip(skip).limit(parseInt(limit)),
    Product.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: products,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  })
})

export const getFeaturedProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug')
    .limit(8)
  res.json({ success: true, data: products })
})

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category')
  if (!product) throw new ApiError(404, 'Producto no encontrado')
  res.json({ success: true, data: product })
})

const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = { ...req.body }
  if (!body.slug && body.name) {
    const base = generateSlug(body.name)
    const existing = await Product.findOne({ slug: base })
    body.slug = existing ? `${base}-${Date.now().toString(36)}` : base
  }
  const product = await Product.create(body)
  res.status(201).json({ success: true, data: product })
})

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  if (!product) throw new ApiError(404, 'Producto no encontrado')
  res.json({ success: true, data: product })
})

export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const { stock } = req.body as { stock: number }
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { stock },
    { new: true, runValidators: true }
  )
  if (!product) throw new ApiError(404, 'Producto no encontrado')
  res.json({ success: true, data: { id: product._id, stock: product.stock } })
})

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!product) throw new ApiError(404, 'Producto no encontrado')
  res.json({ success: true, message: 'Producto desactivado' })
})
