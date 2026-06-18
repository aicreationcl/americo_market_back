import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export interface IProductImage {
  url: string
  alt: string
}

export interface IProduct extends Document {
  name: string
  slug: string
  sku: string
  description: string
  shortDescription: string
  category: Types.ObjectId
  images: IProductImage[]
  price: number           // CLP entero — nunca flotante
  compareAtPrice?: number
  unit: 'un' | 'kg' | 'lt' | 'paq'
  stock: number
  lowStockThreshold: number
  isActive: boolean
  isFeatured: boolean
  brand: string
  barcode: string
  weight: number          // gramos
  meta: {
    title?: string
    description?: string
    keywords?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    images: [{ url: String, alt: String }],
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    unit: { type: String, enum: ['un', 'kg', 'lt', 'paq'], default: 'un' },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    brand: { type: String, default: '' },
    barcode: { type: String, default: '' },
    weight: { type: Number, default: 0 },
    meta: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  { timestamps: true }
)

productSchema.index({ category: 1, isActive: 1 })
productSchema.index({ name: 'text', description: 'text', brand: 'text' })
productSchema.index({ isFeatured: 1, isActive: 1 })

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema)
export default Product
