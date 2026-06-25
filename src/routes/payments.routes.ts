import { Router } from 'express'
import { mpInit, mpWebhook, webpayInit, webpayConfirm } from '../controllers/payments.controller'
import { optionalAuth } from '../middleware/optionalAuth.middleware'

const router = Router()

// MercadoPago
router.post('/mp/init', optionalAuth, mpInit)
router.post('/mp/webhook', mpWebhook)

// WebPay Plus
router.post('/webpay/init', optionalAuth, webpayInit)
router.get('/webpay/confirm', webpayConfirm)

export default router
