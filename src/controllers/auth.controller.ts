import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken'
import { ApiError } from '../utils/ApiError'
import asyncHandler from '../utils/asyncHandler'
import { config } from '../config'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
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

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone } = req.body as { name?: string; phone?: string }
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { ...(name && { name }), ...(phone && { phone }) },
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshTokens')
  res.json({ success: true, data: user })
})
