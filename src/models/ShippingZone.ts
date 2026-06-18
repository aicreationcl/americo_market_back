import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IShippingZone extends Document {
  commune: string
  region: string
  cost: number        // CLP entero
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

const shippingZoneSchema = new Schema<IShippingZone>(
  {
    commune: { type: String, required: true, unique: true, trim: true },
    region: { type: String, default: 'Región Metropolitana' },
    cost: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const ShippingZone: Model<IShippingZone> = mongoose.model<IShippingZone>('ShippingZone', shippingZoneSchema)
export default ShippingZone
