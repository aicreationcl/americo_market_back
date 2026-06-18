import { CorsOptions } from 'cors'

const allowedOrigins = [
  process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  'http://localhost:3000',
]

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS bloqueado para el origen: ${origin}`))
    }
  },
  credentials: true,
}
