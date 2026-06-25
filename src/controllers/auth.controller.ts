import { Request, Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken'
import { ApiError } from '../utils/ApiError'
import asyncHandler from '../utils/asyncHandler'
import { config } from '../config'
import { sendPasswordResetEmail } from '../services/email.service'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  // In production (Railway) frontend and backend are different subdomains → need 'none'
  // In development both are localhost → 'strict' is fine
  sameSite: (config.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string }

  const existing = await User.findOne({ email })
  if (existing) throw new ApiError(409, 'El email ya está registrado')

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })

  const accessToken = generateAccessToken({ id: String(user._id), role: user.role })
  const refreshToken = generateRefreshToken({ id: String(user._id) })

  user.refreshTokens.push(refreshToken)
  await user.save()

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS)
  res.status(201).json({
    success: true,
    data: {
      accessToken,
      user: { _id: String(user._id), name: user.name, email: user.email, role: user.role, profileImage: user.profileImage || '' },
    },
  })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string }

  const user = await User.findOne({ email, isActive: true })
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Credenciales incorrectas')
  }

  const accessToken = generateAccessToken({ id: String(user._id), role: user.role })
  const refreshToken = generateRefreshToken({ id: String(user._id) })

  user.refreshTokens.push(refreshToken)
  if (user.refreshTokens.length > 5) user.refreshTokens.shift()
  await user.save()

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS)
  res.json({
    success: true,
    data: {
      accessToken,
      user: { _id: String(user._id), name: user.name, email: user.email, role: user.role, profileImage: user.profileImage || '' },
    },
  })
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies.refreshToken
  if (!token) throw new ApiError(401, 'Refresh token no encontrado')

  let decoded: { id: string }
  try {
    decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { id: string }
  } catch {
    throw new ApiError(401, 'Refresh token inválido o expirado')
  }

  const user = await User.findById(decoded.id)
  if (!user || !user.refreshTokens.includes(token)) {
    throw new ApiError(401, 'Refresh token revocado')
  }

  const newAccessToken = generateAccessToken({ id: String(user._id), role: user.role })
  const newRefreshToken = generateRefreshToken({ id: String(user._id) })

  user.refreshTokens = user.refreshTokens.filter((t) => t !== token)
  user.refreshTokens.push(newRefreshToken)
  await user.save()

  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS)
  res.json({ success: true, data: { accessToken: newAccessToken } })
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies.refreshToken
  if (token && req.user) {
    const user = await User.findById(req.user.id)
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== token)
      await user.save()
    }
  }
  res.clearCookie('refreshToken')
  res.json({ success: true, message: 'Sesión cerrada' })
})

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('-passwordHash -refreshTokens')
  if (!user) throw new ApiError(404, 'Usuario no encontrado')
  res.json({ success: true, data: user })
})

export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('addresses')
  res.json({ success: true, data: user?.addresses ?? [] })
})

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
  if (!user) throw new ApiError(404, 'Usuario no encontrado')
  if (user.addresses.length >= 5) throw new ApiError(400, 'Máximo 5 direcciones permitidas')

  const isFirst = user.addresses.length === 0
  user.addresses.push({ ...req.body, isDefault: isFirst })
  await user.save()

  res.status(201).json({ success: true, data: user.addresses })
})

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
  if (!user) throw new ApiError(404, 'Usuario no encontrado')

  const addr = user.addresses.find((a) => String(a._id) === req.params.addressId)
  if (!addr) throw new ApiError(404, 'Dirección no encontrada')

  Object.assign(addr, req.body)
  await user.save()

  res.json({ success: true, data: user.addresses })
})

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
  if (!user) throw new ApiError(404, 'Usuario no encontrado')

  const idx = user.addresses.findIndex((a) => String(a._id) === req.params.addressId)
  if (idx === -1) throw new ApiError(404, 'Dirección no encontrada')

  const wasDefault = user.addresses[idx].isDefault
  user.addresses.splice(idx, 1)
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true
  }
  await user.save()

  res.json({ success: true, data: user.addresses })
})

export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
  if (!user) throw new ApiError(404, 'Usuario no encontrado')

  const addr = user.addresses.find((a) => String(a._id) === req.params.addressId)
  if (!addr) throw new ApiError(404, 'Dirección no encontrada')

  user.addresses.forEach((a) => { a.isDefault = false })
  addr.isDefault = true
  await user.save()

  res.json({ success: true, data: user.addresses })
})

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, profileImage } = req.body as { name?: string; phone?: string; profileImage?: string }
  const update: Record<string, unknown> = {}
  if (name) update.name = name
  if (phone !== undefined) update.phone = phone
  if (profileImage !== undefined) update.profileImage = profileImage
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    update,
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshTokens')
  res.json({ success: true, data: user })
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string }

  const user = await User.findOne({ email, isActive: true })
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    const frontendUrl = process.env.FRONTEND_URL ?? 'https://americomarketfront-production.up.railway.app'
    const resetUrl = `${frontendUrl}/restablecer-contrasena?token=${rawToken}`
    sendPasswordResetEmail(user.email, user.name, resetUrl).catch(() => {})
  }

  res.json({ success: true, message: 'Si el correo existe en nuestro sistema, recibirás instrucciones en tu bandeja de entrada.' })
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  })

  if (!user) throw new ApiError(400, 'El enlace es inválido o ha expirado')

  user.passwordHash = await bcrypt.hash(newPassword, 10)
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  user.refreshTokens = []
  await user.save()

  res.json({ success: true, message: 'Contraseña actualizada correctamente' })
})

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }

  const user = await User.findById(req.user!.id)
  if (!user) throw new ApiError(404, 'Usuario no encontrado')

  const isValid = await user.comparePassword(currentPassword)
  if (!isValid) throw new ApiError(400, 'La contraseña actual es incorrecta')

  user.passwordHash = await bcrypt.hash(newPassword, 10)
  await user.save()

  res.json({ success: true, message: 'Contraseña cambiada correctamente' })
})
