import { Request, Response } from 'express'
import Order, { OrderStatus } from '../models/Order'
import Product from '../models/Product'
import User from '../models/User'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'

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
