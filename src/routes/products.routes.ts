import { Router } from 'express'
import * as products from '../controllers/products.controller'
import { authenticate } from '../middleware/auth.middleware'
import { isAdmin } from '../middleware/isAdmin.middleware'

const router = Router()

router.get('/', products.getProducts)
router.get('/featured', products.getFeaturedProducts)
router.get('/:slug', products.getProductBySlug)

router.post('/', authenticate, isAdmin, products.createProduct)
router.patch('/:id', authenticate, isAdmin, products.updateProduct)
router.patch('/:id/stock', authenticate, isAdmin, products.updateStock)
router.delete('/:id', authenticate, isAdmin, products.deleteProduct)

export default router
