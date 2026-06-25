import { Request, Response } from 'express'
import Order, { OrderStatus } from '../models/Order'
import Product from '../models/Product'
import User from '../models/User'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { uploadProductImage } from '../services/cloudinary.service'
import { sendOrderStatusUpdate } from '../services/email.service'

export const getAdminProducts = asyncHandler(async (req: Request, res: Response) => {
  const { search = '', page = '1', limit = '15', status } = req.query as Record<string, string>

  const filter: Record<string, unknown> = {}
  if (status === 'active') filter.isActive = true
  else if (status === 'inactive') filter.isActive = false

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: products,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  })
})

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [todayOrders, revenueResult, lowStock, recentOrders] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
    Order.find().sort({ createdAt: -1 }).limit(5).select('orderNumber status total createdAt'),
  ])

  res.json({
    success: true,
    data: {
      ordersToday: todayOrders,
      revenueToday: revenueResult[0]?.total ?? 0,
      lowStockCount: lowStock,
      recentOrders,
    },
  })
})

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Order.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: orders,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  })
})

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body as { status: OrderStatus; note?: string }

  const order = await Order.findById(req.params.id)
  if (!order) throw new ApiError(404, 'Pedido no encontrado')

  order.status = status
  order.statusHistory.push({ status, changedAt: new Date(), note })
  await order.save()

  sendOrderStatusUpdate(order).catch(() => {})

  res.json({ success: true, data: order })
})

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', search = '', role } = req.query as Record<string, string>

  const filter: Record<string, unknown> = {}
  if (role) filter.role = role
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  })
})

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'No se recibió ningún archivo')

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    throw new ApiError(400, 'Formato no permitido. Usa JPG, PNG, WebP o GIF.')
  }

  const result = await uploadProductImage(req.file.buffer, req.file.originalname)
  res.json({ success: true, data: { url: result.url, publicId: result.publicId } })
})

export const exportOrders = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, status } = req.query as Record<string, string>

  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.$gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      dateFilter.$lte = end
    }
    filter.createdAt = dateFilter
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(5000)

  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = 'Número,Fecha,Cliente,Email,Tipo Entrega,Estado,Método Pago,Total\n'
  const rows = orders.map((o) => {
    const date = new Date(o.createdAt).toLocaleDateString('es-CL')
    const fulfillment = o.fulfillment?.type === 'pickup' ? 'Retiro' : 'Envío'
    return [
      o.orderNumber,
      date,
      escape(o.customer?.name ?? ''),
      escape(o.customer?.email ?? ''),
      fulfillment,
      o.status,
      o.payment?.method ?? '',
      o.total,
    ].join(',')
  }).join('\n')

  const today = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="pedidos-AMERICO-${today}.csv"`)
  res.send('﻿' + header + rows)
})

export const getAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [revenueMonthResult, revenueTodayResult, topProductsResult, topCategoriesResult, topCommunesResult] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfToday }, 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: '$_id', totalSold: 1, revenue: 1 } },
    ]),
    Order.aggregate([
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cat.name', revenue: { $sum: '$items.subtotal' }, orderCount: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, category: { $ifNull: ['$_id', 'Sin categoría'] }, revenue: 1, orderCount: 1 } },
    ]),
    Order.aggregate([
      { $match: { 'fulfillment.type': 'delivery', 'fulfillment.address.commune': { $exists: true, $ne: '' } } },
      { $group: { _id: '$fulfillment.address.commune', orderCount: { $sum: 1 } } },
      { $sort: { orderCount: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, commune: '$_id', orderCount: 1 } },
    ]),
  ])

  res.json({
    success: true,
    data: {
      revenueToday: revenueTodayResult[0]?.total ?? 0,
      revenueThisMonth: revenueMonthResult[0]?.total ?? 0,
      topProducts: topProductsResult,
      topCategories: topCategoriesResult,
      topCommunes: topCommunesResult,
    },
  })
})

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role: 'customer' | 'admin' }

  if (req.params.id === req.user!.id) {
    throw new ApiError(400, 'No puedes cambiar tu propio rol')
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshTokens')

  if (!user) throw new ApiError(404, 'Usuario no encontrado')

  res.json({ success: true, data: user })
})
