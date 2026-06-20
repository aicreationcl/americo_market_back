import mongoose from 'mongoose'
import { config } from './config'
import { connectDatabase } from './config/database'
import { createApp } from './app'
import { seedDatabase } from './scripts/seed'

export const main = async (): Promise<void> => {
  await connectDatabase(config.MONGODB_URI)

  if (config.RUN_SEEDS) {
    await seedDatabase()
  }

  const app = createApp()

  const server = app.listen(config.PORT, () => {
    console.log(`\n🚀 AMERICO API corriendo en puerto ${config.PORT}`)
    console.log(`   Entorno : ${config.NODE_ENV}`)
    console.log(`   Health  : http://localhost:${config.PORT}/api/v1/health\n`)
  })

  server.on('error', (error) => {
    console.error(error)
    process.exit(1)
  })

  const gracefulShutdown = async () => {
    console.log('Cerrando aplicación...')

    server.close(async () => {
      await mongoose.disconnect()
      process.exit(0)
    })
  }

  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
}