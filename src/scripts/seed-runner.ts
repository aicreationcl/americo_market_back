import 'dotenv/config'

import Category from '../models/Category'
import Product from '../models/Product'
import User from '../models/User'
import ShippingZone from '../models/ShippingZone'

import { config } from '../config'
import { connectDatabase } from '../config/database'
import { seedDatabase } from './seed'

async function run() {
  await connectDatabase(config.MONGODB_URI)

  const drop = process.argv.includes('--drop')

  if (drop) {
    console.log('🗑 Limpiando colecciones...')

    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({}),
      ShippingZone.deleteMany({})
    ])
  }

  await seedDatabase()

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})