import { Router } from 'express'
import { mpInit, mpWebhook } from '../controllers/payments.controller'
import { optionalAuth } from '../middleware/optionalAuth.middleware'

const router = Router()

// MercadoPago
router.post('/mp/init', optionalAuth, mpInit)
router.post('/mp/webhook', mpWebhook)

export default router
