import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    USE_MEMORY_DB: z.coerce.boolean().default(false),

    RUN_SEEDS: z.coerce.boolean().default(false),

    PORT: z.coerce.number().default(3001),

    MONGODB_URI: z.string().optional(),

    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),

    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),

    JWT_EXPIRES_IN: z.string().default('15m'),

    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    FREE_SHIPPING_THRESHOLD: z.coerce.number().default(50000),
  })
  .refine(
    (data) => data.USE_MEMORY_DB || Boolean(data.MONGODB_URI),
    {
      message: 'MONGODB_URI es requerida cuando USE_MEMORY_DB=false',
      path: ['MONGODB_URI'],
    }
  )

export type Config = z.infer<typeof envSchema>

const result = envSchema.safeParse(process.env)

if (!result.success) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Variables de entorno inválidas:')

    result.error.issues.forEach((e) => {
      console.error(`   - ${e.path.join('.')}: ${e.message}`)
    })

    process.exit(1)
  }
}

export const config: Config = result.success
  ? result.data
  : {
      NODE_ENV: 'test',
      USE_MEMORY_DB: true,
      RUN_SEEDS: false,
      PORT: 3001,
      MONGODB_URI: undefined,
      JWT_SECRET: 'test-secret-fallback-32-chars-long!!',
      JWT_REFRESH_SECRET: 'test-refresh-fallback-32chars-xx',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:5173',
      FREE_SHIPPING_THRESHOLD: 50000,
    }