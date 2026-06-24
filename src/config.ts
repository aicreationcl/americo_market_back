import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    USE_MEMORY_DB: z.string().default('false').transform((v) => v === 'true'),

    RUN_SEEDS: z.string().default('false').transform((v) => v === 'true'),

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

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    RESEND_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().email().optional().default('noreply@americo.cl'),
    ADMIN_EMAIL: z.string().email().optional(),

    MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
    FRONTEND_URL: z.string().url().optional().default('http://localhost:5173'),
    BACKEND_URL: z.string().url().optional().default('http://localhost:3001'),
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
      CLOUDINARY_CLOUD_NAME: undefined,
      CLOUDINARY_API_KEY: undefined,
      CLOUDINARY_API_SECRET: undefined,
      RESEND_API_KEY: undefined,
      FROM_EMAIL: 'noreply@americo.cl',
      ADMIN_EMAIL: undefined,
      MERCADOPAGO_ACCESS_TOKEN: undefined,
      FRONTEND_URL: 'http://localhost:5173',
      BACKEND_URL: 'http://localhost:3001',
    }