import { Request, Response } from 'express'
import * as cartService from '../services/cart.service'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'

const resolveCart = (req: Request) => {
  const sessionId = req.headers['x-session-id'] as string | undefined
  const userId = req.user?.id
  return cartService.getOrCreateCart(sessionId, userId)
}

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await resolveCart(req)
  res.json({ success: true, data: cart })
})

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity = 1 } = req.body as { productId: string; quantity?: number }
  if (!productId) throw new ApiError(400, 'productId es requerido')

  const cart = await resolveCart(req)
  const updated = await cartService.addItem(cart, productId, quantity)
  res.json({ success: true, data: updated })
})

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body as { quantity: number }
  const cart = await resolveCart(req)
  const updated = await cartService.updateItem(cart, req.params.productId, quantity)
  res.json({ success: true, data: updated })
})

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await resolveCart(req)
  const updated = await cartService.removeItem(cart, req.params.productId)
  res.json({ success: true, data: updated })
})

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await resolveCart(req)
  await cartService.clearCart(cart._id as unknown as string)
  res.json({ success: true, message: 'Carrito vaciado' })
})

export const mergeCart = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string | undefined
  if (!sessionId) throw new ApiError(400, 'X-Session-Id es requerido para el merge')
  await cartService.mergeGuestCart(sessionId, req.user!.id)
  const cart = await cartService.getOrCreateCart(undefined, req.user!.id)
  res.json({ success: true, data: cart })
})
