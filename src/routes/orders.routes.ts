import { Router } from 'express'
import * as orders from '../controllers/orders.controller'
import { authenticate } from '../middleware/auth.middleware'
import { optionalAuth } from '../middleware/optionalAuth.middleware'
import { validate } from '../middleware/validate.middleware'
import { PlaceOrderSchema } from '../schemas/order.schema'

const router = Router()

router.post('/', optionalAuth, validate(PlaceOrderSchema), orders.placeOrder)
router.get('/my', authenticate, orders.getMyOrders)
router.get('/track/:orderNumber', orders.trackOrder)
router.get('/:id', authenticate, orders.getOrderById)

export default router
