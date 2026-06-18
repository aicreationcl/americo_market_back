import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Error de negocio conocido
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
    return
  }

  // Mongoose: campo duplicado (unique index)
  if ((err as NodeJS.ErrnoException).message?.includes('E11000')) {
    res.status(409).json({ success: false, message: 'Ya existe un registro con ese valor' })
    return
  }

  // Mongoose: error de validación
  if (err.name === 'ValidationError') {
    res.status(400).json({ success: false, message: err.message })
    return
  }

  // JWT inválido
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' })
    return
  }

  console.error('[Error no manejado]', err)
  res.status(500).json({ success: false, message: 'Error interno del servidor' })
}
