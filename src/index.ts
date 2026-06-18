import 'dotenv/config'
import { main } from './main'

main().catch((err: Error) => {
  console.error('❌ Error fatal al iniciar la aplicación:', err.message)
  process.exit(1)
})
