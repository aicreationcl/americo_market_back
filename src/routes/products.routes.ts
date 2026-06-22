import { Router } from 'express'
import * as products from '../controllers/products.controller'
import { authenticate } from '../middleware/auth.middleware'
import { isAdmin } from '../middleware/isAdmin.middleware'
import { validate } from '../middleware/validate.middleware'
import { CreateProductSchema, UpdateProductSchema, UpdateStockSchema } from '../schemas/product.schema'

const router = Router()

router.get('/', products.getProducts)
router.get('/featured', products.getFeaturedProducts)
router.get('/:slug', products.getProductBySlug)

router.post('/', authenticate, isAdmin, validate(CreateProductSchema), products.createProduct)
router.patch('/:id', authenticate, isAdmin, validate(UpdateProductSchema), products.updateProduct)
router.patch('/:id/stock', authenticate, isAdmin, validate(UpdateStockSchema), products.updateStock)
router.delete('/:id', authenticate, isAdmin, products.deleteProduct)

export default router
