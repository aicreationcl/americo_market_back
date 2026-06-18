import mongoose, { Document, Schema, Model } from 'mongoose'

export interface ICategory extends Document {
  name: string
  slug: string
  description: string
  imageUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

categorySchema.index({ sortOrder: 1 })

const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema)
export default Category
