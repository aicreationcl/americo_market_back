import { Request, Response } from 'express'
import * as shippingService from '../services/shipping.service'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'

export const calculate = asyncHandler(async (req: Request, res: Response) => {
  const { commune, cartTotal } = req.body as { commune: string; cartTotal: number }
  if (!commune) throw new ApiError(400, 'La comuna es requerida')
  const result = await shippingService.calculateShipping(commune, cartTotal ?? 0)
  res.json({ success: true, data: result })
})

export const getCommunes = asyncHandler(async (_req: Request, res: Response) => {
  const communes = await shippingService.getAvailableCommunes()
  res.json({ success: true, data: communes })
})

export const getStores = asyncHandler(async (_req: Request, res: Response) => {
  const stores = shippingService.getPickupStores()
  res.json({ success: true, data: stores })
})
