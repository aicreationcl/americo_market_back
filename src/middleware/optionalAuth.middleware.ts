import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.split(' ')[1]
      const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; role: string }
      req.user = { id: decoded.id, role: decoded.role }
    } catch {
      // Sin token válido → continúa como guest
    }
  }
  next()
}
