import { Request, Response } from 'express'
import Order, { OrderStatus } from '../models/Order'
import Product from '../models/Product'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'

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
