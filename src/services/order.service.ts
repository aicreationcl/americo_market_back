import { Types } from 'mongoose'
import Order, { FulfillmentType, PaymentMethod } from '../models/Order'
import Product from '../models/Product'
import Cart from '../models/Cart'
import { clearCart } from './cart.service'
import { ApiError } from '../utils/ApiError'

export const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear()
  const prefix = `AME-${year}-`
  const last = await Order.findOne({ orderNumber: new RegExp(`^${prefix}`) }).sort({ orderNumber: -1 })
  const seq = last ? parseInt(last.orderNumber.split('-')[2], 10) + 1 : 1
  return `${prefix}${String(seq).padStart(5, '0')}`
}

interface CustomerData {
  name: string
  email: string
  phone?: string
  rut?: string
}

interface FulfillmentData {
  type: FulfillmentType
  shippingCost?: number
  address?: {
    street?: string
    number?: string
    commune?: string
    region?: string
    additionalInfo?: string
  }
  pickupStore?: { name?: string; address?: string }
  estimatedDate?: Date
}

interface CreateOrderPayload {
  cartId: string
  userId?: string
  customerData: CustomerData
  fulfillmentData: FulfillmentData
  paymentMethod?: PaymentMethod
  notes?: string
}

export const createOrder = async ({
  cartId,
  userId,
  customerData,
  fulfillmentData,
  paymentMethod,
  notes,
}: CreateOrderPayload) => {
  const cart = await Cart.findById(cartId)
  if (!cart || cart.items.length === 0) throw new ApiError(400, 'El carrito está vacío')

  // Validar stock de cada item
  for (const item of cart.items) {
    const product = await Product.findById(item.product)
    if (!product || !product.isActive) {
      throw new ApiError(400, `Producto no disponible: ${item.name}`)
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Stock insuficiente para "${item.name}". Disponible: ${product.stock}`)
    }
  }

  const orderItems = cart.items.map((item) => ({
    product: item.product,
    name: item.name,
    sku: item.sku,
    price: item.price,
    quantity: item.quantity,
    imageUrl: item.imageUrl,
    subtotal: item.price * item.quantity,
  }))

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0)
  const shippingCost = fulfillmentData.type === 'pickup' ? 0 : (fulfillmentData.shippingCost ?? 0)
  const total = subtotal + shippingCost

  const orderNumber = await generateOrderNumber()

  const defaultMethod: PaymentMethod =
    fulfillmentData.type === 'pickup' ? 'cash_on_pickup' : 'cash_on_delivery'

  const order = await Order.create({
    orderNumber,
    customer: {
      userId: userId ? new Types.ObjectId(userId) : undefined,
      ...customerData,
    },
    items: orderItems,
    subtotal,
    shippingCost,
    discount: 0,
    total,
    fulfillment: fulfillmentData,
    payment: { method: paymentMethod ?? defaultMethod, status: 'pending' },
    statusHistory: [{ status: 'pending_payment', note: 'Orden creada' }],
    notes,
  })

  // Descontar stock
  await Promise.all(
    cart.items.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    )
  )

  await clearCart(cart._id as Types.ObjectId)

  return order
}
