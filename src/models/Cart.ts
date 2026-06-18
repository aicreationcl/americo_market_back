import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export interface ICartItem {
  product: Types.ObjectId
  name: string
  price: number       // snapshot al momento de agregar
  imageUrl: string
  quantity: number
  sku: string
}

export interface ICart extends Document {
  sessionId?: string   // UUID para guests (header X-Session-Id)
  user?: Types.ObjectId
  items: ICartItem[]
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const cartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  sku: { type: String, required: true },
})

const cartSchema = new Schema<ICart>(
  {
    sessionId: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [cartItemSchema],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

cartSchema.index({ sessionId: 1 }, { sparse: true })
cartSchema.index({ user: 1 }, { sparse: true })
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const Cart: Model<ICart> = mongoose.model<ICart>('Cart', cartSchema)
export default Cart
