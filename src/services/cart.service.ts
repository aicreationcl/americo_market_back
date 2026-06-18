import { Types } from 'mongoose'
import Cart, { ICart } from '../models/Cart'
import Product from '../models/Product'
import { ApiError } from '../utils/ApiError'

const GUEST_TTL_DAYS = 7
const USER_TTL_DAYS = 30

const getExpiry = (isUser: boolean): Date => {
  const d = new Date()
  d.setDate(d.getDate() + (isUser ? USER_TTL_DAYS : GUEST_TTL_DAYS))
  return d
}

export const getOrCreateCart = async (sessionId?: string, userId?: string): Promise<ICart> => {
  if (userId) {
    let cart = await Cart.findOne({ user: new Types.ObjectId(userId) })
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], expiresAt: getExpiry(true) })
    }
    return cart
  }
  if (!sessionId) throw new ApiError(400, 'Se requiere X-Session-Id para carritos de invitados')
  let cart = await Cart.findOne({ sessionId })
  if (!cart) {
    cart = await Cart.create({ sessionId, items: [], expiresAt: getExpiry(false) })
  }
  return cart
}

export const addItem = async (cart: ICart, productId: string, quantity: number): Promise<ICart> => {
  const product = await Product.findById(productId)
  if (!product || !product.isActive) throw new ApiError(404, 'Producto no encontrado')

  const existing = cart.items.find((i) => i.product.toString() === productId)
  const newQty = (existing?.quantity ?? 0) + quantity

  if (product.stock < newQty) {
    throw new ApiError(400, `Stock insuficiente. Disponible: ${product.stock}`)
  }

  if (existing) {
    existing.quantity = newQty
  } else {
    cart.items.push({
      product: product._id as Types.ObjectId,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0]?.url ?? '',
      quantity,
      sku: product.sku,
    })
  }

  cart.expiresAt = getExpiry(!!cart.user)
  return cart.save()
}

export const updateItem = async (cart: ICart, productId: string, quantity: number): Promise<ICart> => {
  const idx = cart.items.findIndex((i) => i.product.toString() === productId)
  if (idx === -1) throw new ApiError(404, 'Producto no encontrado en el carrito')

  if (quantity <= 0) {
    cart.items.splice(idx, 1)
  } else {
    const product = await Product.findById(productId)
    if (product && product.stock < quantity) {
      throw new ApiError(400, `Stock insuficiente. Disponible: ${product.stock}`)
    }
    cart.items[idx].quantity = quantity
  }
  return cart.save()
}

export const removeItem = async (cart: ICart, productId: string): Promise<ICart> => {
  cart.items = cart.items.filter((i) => i.product.toString() !== productId)
  return cart.save()
}

export const clearCart = async (cartId: Types.ObjectId | string): Promise<void> => {
  await Cart.findByIdAndUpdate(cartId, { items: [] })
}

export const mergeGuestCart = async (sessionId: string, userId: string): Promise<void> => {
  const guestCart = await Cart.findOne({ sessionId })
  if (!guestCart || guestCart.items.length === 0) return

  let userCart = await Cart.findOne({ user: new Types.ObjectId(userId) })
  if (!userCart) {
    userCart = await Cart.create({ user: userId, items: [], expiresAt: getExpiry(true) })
  }

  for (const guestItem of guestCart.items) {
    const existing = userCart.items.find((i) => i.product.toString() === guestItem.product.toString())
    if (existing) {
      existing.quantity = Math.max(existing.quantity, guestItem.quantity)
    } else {
      userCart.items.push({ ...guestItem })
    }
  }

  await userCart.save()
  await Cart.deleteOne({ _id: guestCart._id })
}
