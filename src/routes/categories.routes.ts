import { Router } from 'express'
import * as categories from '../controllers/categories.controller'
import { authenticate } from '../middleware/auth.middleware'
import { isAdmin } from '../middleware/isAdmin.middleware'

const router = Router()

router.get('/', categories.getCategories)
router.get('/:slug', categories.getCategoryBySlug)

router.post('/', authenticate, isAdmin, categories.createCategory)
router.patch('/:id', authenticate, isAdmin, categories.updateCategory)
router.delete('/:id', authenticate, isAdmin, categories.deleteCategory)

export default router
