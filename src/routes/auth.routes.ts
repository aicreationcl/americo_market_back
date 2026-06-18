import { Router } from 'express'
import * as auth from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { z } from 'zod'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/register', validate(registerSchema), auth.register)
router.post('/login', validate(loginSchema), auth.login)
router.post('/refresh', auth.refresh)
router.post('/logout', authenticate, auth.logout)
router.get('/me', authenticate, auth.getMe)
router.patch('/me', authenticate, auth.updateMe)

export default router
