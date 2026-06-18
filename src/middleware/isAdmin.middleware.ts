import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export const isAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Acceso denegado — se requiere rol administrador'))
  }
  next()
}
