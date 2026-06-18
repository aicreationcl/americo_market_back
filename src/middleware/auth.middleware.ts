import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { ApiError } from '../utils/ApiError'

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'No autorizado — token requerido'))
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; role: string }
    req.user = { id: decoded.id, role: decoded.role }
    next()
  } catch {
    next(new ApiError(401, 'Token inválido o expirado'))
  }
}
