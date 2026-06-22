import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { corsOptions } from './config/corsOptions'
import { errorHandler } from './middleware/errorHandler.middleware'
import { config } from './config'

import authRoutes from './routes/auth.routes'
import categoriesRoutes from './routes/categories.routes'
import productsRoutes from './routes/products.routes'
import cartRoutes from './routes/cart.routes'
import shippingRoutes from './routes/shipping.routes'
import ordersRoutes from './routes/orders.routes'
import adminRoutes from './routes/admin.routes'

export const createApp = (): Application => {
  const app = express()

  const API_PREFIX = '/api/v1'

  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(morgan('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())

  app.get(
    `${API_PREFIX}/health`,
    (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        service: 'Americo API',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString()
      })
    }
  )

  // app.use('/api/v1/auth', authRoutes)
  app.use(`${API_PREFIX}/auth`, authRoutes)
  app.use(`${API_PREFIX}/categories`, categoriesRoutes)
  app.use(`${API_PREFIX}/products`, productsRoutes)
  app.use(`${API_PREFIX}/cart`, cartRoutes)
  app.use(`${API_PREFIX}/shipping`, shippingRoutes)
  app.use(`${API_PREFIX}/orders`, ordersRoutes)
  app.use(`${API_PREFIX}/admin`, adminRoutes)

  app.use(errorHandler)

  return app
}
