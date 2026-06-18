import { Router } from 'express'
import * as shipping from '../controllers/shipping.controller'

const router = Router()

router.post('/calculate', shipping.calculate)
router.get('/communes', shipping.getCommunes)
router.get('/stores', shipping.getStores)

export default router
