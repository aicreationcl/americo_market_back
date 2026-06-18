import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { corsOptions } from './config/corsOptions'
import { errorHandler } from './middleware/errorHandler.middleware'

import authRoutes from './routes/auth.routes'
import categoriesRoutes from './routes/categories.routes'
import productsRoutes from './routes/products.routes'
import cartRoutes from './routes/cart.routes'
import shippingRoutes from './routes/shipping.routes'
import ordersRoutes from './routes/orders.routes'
import adminRoutes from './routes/admin.routes'

export const createApp = (): Application => {
  const app = express()

  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(morgan('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/categories', categoriesRoutes)
  app.use('/api/v1/products', productsRoutes)
  app.use('/api/v1/cart', cartRoutes)
  app.use('/api/v1/shipping', shippingRoutes)
  app.use('/api/v1/orders', ordersRoutes)
  app.use('/api/v1/admin', adminRoutes)

  app.use(errorHandler)

  return app
}
