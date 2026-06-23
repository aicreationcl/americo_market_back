import mongoose, { Document, Schema, Model, Types } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IAddress {
  _id: Types.ObjectId
  alias: string
  street: string
  number: string
  commune: string
  region: string
  additionalInfo?: string
  isDefault: boolean
}

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: 'customer' | 'admin'
  phone: string
  profileImage: string
  addresses: IAddress[]
  isActive: boolean
  emailVerified: boolean
  refreshTokens: string[]
  comparePassword(plain: string): Promise<boolean>
  createdAt: Date
  updatedAt: Date
}

const addressSchema = new Schema<IAddress>({
  alias: { type: String, default: 'Casa' },
  street: { type: String, required: true },
  number: { type: String, required: true },
  commune: { type: String, required: true },
  region: { type: String, default: 'Región Metropolitana' },
  additionalInfo: String,
  isDefault: { type: Boolean, default: false },
})

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    addresses: [addressSchema],
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    refreshTokens: [String],
  },
  { timestamps: true }
)

userSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash as string)
}

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema)
export default User
