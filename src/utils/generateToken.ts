import jwt from 'jsonwebtoken'
import { config } from '../config'

interface AccessPayload {
  id: string
  role: string
}

interface RefreshPayload {
  id: string
}

export const generateAccessToken = (payload: AccessPayload): string =>
  jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })

export const generateRefreshToken = (payload: RefreshPayload): string =>
  jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
