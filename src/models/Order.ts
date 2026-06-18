import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export type OrderStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentMethod = 'cash_on_delivery' | 'cash_on_pickup' | 'webpay' | 'mercadopago'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type FulfillmentType = 'delivery' | 'pickup'

export interface IOrderItem {
  product: Types.ObjectId
  name: string
  sku: string
  price: number
  quantity: number
  imageUrl: string
  subtotal: number
}

export interface IOrder extends Document {
  orderNumber: string
  customer: {
    userId?: Types.ObjectId
    name: string
    email: string
    phone?: string
    rut?: string
  }
  items: IOrderItem[]
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  fulfillment: {
    type: FulfillmentType
    address?: {
      street?: string
      number?: string
      commune?: string
      region?: string
      additionalInfo?: string
    }
    pickupStore?: {
      name?: string
      address?: string
    }
    estimatedDate?: Date
    deliveredAt?: Date
  }
  status: OrderStatus
  payment: {
    method: PaymentMethod
    status: PaymentStatus
    transactionId?: string
    paidAt?: Date
    gatewayResponse?: unknown
  }
  statusHistory: Array<{
    status: OrderStatus
    changedAt: Date
    note?: string
  }>
  notes?: string
  internalNotes?: string
  createdAt: Date
  updatedAt: Date
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  sku: String,
  price: Number,
  quantity: Number,
  imageUrl: String,
  subtotal: Number,
})

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      rut: String,
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    fulfillment: {
      type: { type: String, enum: ['delivery', 'pickup'], required: true },
      address: {
        street: String,
        number: String,
        commune: String,
        region: String,
        additionalInfo: String,
      },
      pickupStore: { name: String, address: String },
      estimatedDate: Date,
      deliveredAt: Date,
    },
    status: {
      type: String,
      enum: ['pending_payment', 'payment_confirmed', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered', 'cancelled', 'refunded'],
      default: 'pending_payment',
    },
    payment: {
      method: { type: String, enum: ['cash_on_delivery', 'cash_on_pickup', 'webpay', 'mercadopago'] },
      status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
      transactionId: String,
      paidAt: Date,
      gatewayResponse: Schema.Types.Mixed,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],
    notes: String,
    internalNotes: String,
  },
  { timestamps: true }
)

orderSchema.index({ 'customer.userId': 1 })
orderSchema.index({ 'customer.email': 1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ createdAt: -1 })

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema)
export default Order
