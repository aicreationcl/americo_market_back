import mongoose from 'mongoose'

export const connectDatabase = async (uri: string): Promise<void> => {
  if (!uri) throw new Error('MONGODB_URI no está definida')
  const conn = await mongoose.connect(uri)
  console.log(`✅ MongoDB conectado: ${conn.connection.host}`)
}
