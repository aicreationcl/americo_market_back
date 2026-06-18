import { config } from './config'
import { connectDatabase } from './config/database'
import { createApp } from './app'

export const main = async (): Promise<void> => {
  await connectDatabase(config.MONGODB_URI)

  const app = createApp()

  app.listen(config.PORT, () => {
    console.log(`\n🚀 AMERICO API corriendo en puerto ${config.PORT}`)
    console.log(`   Entorno : ${config.NODE_ENV}`)
    console.log(`   Health  : http://localhost:${config.PORT}/api/v1/health\n`)
  })
}
