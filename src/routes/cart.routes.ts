import { Router } from 'express'
import * as cart from '../controllers/cart.controller'
import { optionalAuth } from '../middleware/optionalAuth.middleware'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/', optionalAuth, cart.getCart)
router.post('/items', optionalAuth, cart.addItem)
router.patch('/items/:productId', optionalAuth, cart.updateItem)
router.delete('/items/:productId', optionalAuth, cart.removeItem)
router.delete('/', optionalAuth, cart.clearCart)
router.post('/merge', authenticate, cart.mergeCart)

export default router
