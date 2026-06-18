import { Router } from 'express'
import * as admin from '../controllers/admin.controller'
import { authenticate } from '../middleware/auth.middleware'
import { isAdmin } from '../middleware/isAdmin.middleware'

const router = Router()

router.use(authenticate, isAdmin)

router.get('/dashboard', admin.getDashboard)
router.get('/orders', admin.getAllOrders)
router.patch('/orders/:id/status', admin.updateOrderStatus)

export default router
