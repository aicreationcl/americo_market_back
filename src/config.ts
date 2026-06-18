import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI es requerida'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().default(50000),
})

export type Config = z.infer<typeof envSchema>

const result = envSchema.safeParse(process.env)

if (!result.success) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Variables de entorno inválidas:')
    result.error.errors.forEach((e) =>
      console.error(`   - ${e.path.join('.')}: ${e.message}`)
    )
    process.exit(1)
  }
}

// En test, usa los valores del env.setup.js o los fallbacks
export const config: Config = result.success
  ? result.data
  : {
      NODE_ENV: 'test',
      PORT: 3001,
      MONGODB_URI: process.env.MONGODB_URI ?? '',
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-fallback-32-chars-long!!',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'test-refresh-fallback-32chars-xx',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:5173',
      FREE_SHIPPING_THRESHOLD: 50000,
    }
