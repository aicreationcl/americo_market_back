import { Router } from 'express'
import multer from 'multer'
import * as admin from '../controllers/admin.controller'
import { authenticate } from '../middleware/auth.middleware'
import { isAdmin } from '../middleware/isAdmin.middleware'
import { validate } from '../middleware/validate.middleware'
import { UpdateOrderStatusSchema, UpdateUserRoleSchema } from '../schemas/order.schema'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.use(authenticate, isAdmin)

router.get('/dashboard', admin.getDashboard)
router.get('/analytics', admin.getAnalytics)
router.get('/products', admin.getAdminProducts)
router.post('/products/upload-image', upload.single('image'), admin.uploadImage)

router.get('/orders/export', admin.exportOrders)
router.get('/orders', admin.getAllOrders)
router.patch('/orders/:id/status', validate(UpdateOrderStatusSchema), admin.updateOrderStatus)

router.get('/users', admin.getUsers)
router.patch('/users/:id', validate(UpdateUserRoleSchema), admin.updateUserRole)

export default router
