import { Router, Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import * as auth from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { RegisterSchema, LoginSchema, UpdateMeSchema, AddressSchema, UpdateAddressSchema } from '../schemas/auth.schema'
import { config } from '../config'

const router = Router()

const authLimiter =
  config.NODE_ENV === 'test'
    ? (_req: Request, _res: Response, next: NextFunction) => next()
    : rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        message: { success: false, message: 'Demasiados intentos. Intenta nuevamente en 1 minuto.' },
        standardHeaders: true,
        legacyHeaders: false,
      })

router.post('/register', authLimiter, validate(RegisterSchema), auth.register)
router.post('/login', authLimiter, validate(LoginSchema), auth.login)
router.post('/refresh', auth.refresh)
router.post('/logout', authenticate, auth.logout)
router.get('/me', authenticate, auth.getMe)
router.patch('/me', authenticate, validate(UpdateMeSchema), auth.updateMe)

router.get('/me/addresses', authenticate, auth.getAddresses)
router.post('/me/addresses', authenticate, validate(AddressSchema), auth.addAddress)
router.patch('/me/addresses/:addressId', authenticate, validate(UpdateAddressSchema), auth.updateAddress)
router.delete('/me/addresses/:addressId', authenticate, auth.deleteAddress)
router.patch('/me/addresses/:addressId/default', authenticate, auth.setDefaultAddress)

export default router
