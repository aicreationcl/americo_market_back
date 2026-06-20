import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { config } from '../config'

let mongoMemoryServer: MongoMemoryServer | null = null

export const connectDatabase = async (
   uri?: string
): Promise<void> => {

  if (config.USE_MEMORY_DB) {

    mongoMemoryServer = await MongoMemoryServer.create()

    const memoryUri = mongoMemoryServer.getUri()

    await mongoose.connect(memoryUri)

    console.log('✅ Mongo Memory Server conectado')

    return
  }

  if (!uri) {
    throw new Error(
      'MONGODB_URI es requerida cuando USE_MEMORY_DB=false'
    )
  }

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected')
  })

  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongo Error:', err)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected')
  })

  await mongoose.connect(uri)
}