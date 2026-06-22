import { CorsOptions } from 'cors'

const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173']

const allowedOrigins = [...new Set([...envOrigins, 'http://localhost:3000', 'http://localhost:5173'])]

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
