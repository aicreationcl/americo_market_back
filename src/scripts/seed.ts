import bcrypt from 'bcryptjs'
import Category from '../models/Category'
import Product from '../models/Product'
import User from '../models/User'
import ShippingZone from '../models/ShippingZone'

// ─── Categorías ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Despensa', slug: 'despensa', description: 'Arroz, fideos, aceite, conservas y más', sortOrder: 1 },
  { name: 'Bebidas y Snacks', slug: 'bebidas-y-snacks', description: 'Bebidas, jugos, galletas, papas fritas', sortOrder: 2 },
  { name: 'Botillería', slug: 'botilleria', description: 'Cervezas, vinos, piscos y destilados', sortOrder: 3 },
  { name: 'Chocolates', slug: 'chocolates', description: 'Chocolates, caramelos y confites', sortOrder: 4 },
  { name: 'Lácteos, Fiambrería y Huevos', slug: 'lacteos-fiambres-y-huevos', description: 'Leche, queso, jamón, yogur y huevos', sortOrder: 5 },
]

// ─── Productos por categoría ───────────────────────────────────────────────────
const buildProducts = (catMap: Record<string, string>) => [
  // Despensa (8)
  { name: 'Arroz Grado 1 (1 kg)', slug: 'arroz-grado-1-1kg', sku: 'DES001', price: 1490, category: catMap.despensa, stock: 120, unit: 'kg', brand: 'Tucapel', isFeatured: true },
  { name: 'Fideos Spaghetti 400g', slug: 'fideos-spaghetti-400g', sku: 'DES002', price: 890, category: catMap.despensa, stock: 80, unit: 'paq', brand: 'Carozzi' },
  { name: 'Aceite Vegetal 1L', slug: 'aceite-vegetal-1l', sku: 'DES003', price: 2390, category: catMap.despensa, stock: 60, unit: 'lt', brand: 'Chef' },
  { name: 'Harina sin polvos 1kg', slug: 'harina-sin-polvos-1kg', sku: 'DES004', price: 990, category: catMap.despensa, stock: 50, unit: 'kg', brand: 'Santa Elena' },
  { name: 'Sal de mesa 1kg', slug: 'sal-de-mesa-1kg', sku: 'DES005', price: 590, category: catMap.despensa, stock: 100, unit: 'kg', brand: 'Lobos' },
  { name: 'Azúcar blanca 1kg', slug: 'azucar-blanca-1kg', sku: 'DES006', price: 1190, category: catMap.despensa, stock: 90, unit: 'kg', brand: 'Iansa' },
  { name: 'Atún al agua (170g)', slug: 'atun-al-agua-170g', sku: 'DES007', price: 1690, category: catMap.despensa, stock: 150, unit: 'un', brand: 'Salmofood', isFeatured: true },
  { name: 'Tomate en lata 400g', slug: 'tomate-en-lata-400g', sku: 'DES008', price: 1090, category: catMap.despensa, stock: 70, unit: 'un', brand: 'Cocinero' },

  // Bebidas y Snacks (7)
  { name: 'Coca-Cola 1.5L', slug: 'coca-cola-1-5l', sku: 'BEB001', price: 1890, category: catMap['bebidas-y-snacks'], stock: 200, unit: 'lt', brand: 'Coca-Cola', isFeatured: true },
  { name: 'Agua mineral 1.5L', slug: 'agua-mineral-1-5l', sku: 'BEB002', price: 790, category: catMap['bebidas-y-snacks'], stock: 300, unit: 'lt', brand: 'Cachantun' },
  { name: 'Jugo Baggio manzana 1L', slug: 'jugo-baggio-manzana-1l', sku: 'BEB003', price: 1290, category: catMap['bebidas-y-snacks'], stock: 60, unit: 'lt', brand: 'Baggio' },
  { name: 'Papas fritas Lays 110g', slug: 'papas-fritas-lays-110g', sku: 'BEB004', price: 1490, category: catMap['bebidas-y-snacks'], stock: 80, unit: 'un', brand: 'Lays', isFeatured: true },
  { name: 'Galletas Oreo 154g', slug: 'galletas-oreo-154g', sku: 'BEB005', price: 1590, category: catMap['bebidas-y-snacks'], stock: 60, unit: 'un', brand: 'Oreo' },
  { name: 'Yogur bebible frutilla 1L', slug: 'yogur-bebible-frutilla-1l', sku: 'BEB006', price: 2290, category: catMap['bebidas-y-snacks'], stock: 40, unit: 'lt', brand: 'Soprole' },
  { name: 'Red Bull 250ml', slug: 'red-bull-250ml', sku: 'BEB007', price: 2490, category: catMap['bebidas-y-snacks'], stock: 100, unit: 'un', brand: 'Red Bull' },

  // Botillería (5)
  { name: 'Cerveza Cristal 1L', slug: 'cerveza-cristal-1l', sku: 'BOT001', price: 1990, category: catMap.botilleria, stock: 150, unit: 'lt', brand: 'Cristal', isFeatured: true },
  { name: 'Vino Casillero Cabernet 750ml', slug: 'vino-casillero-cabernet-750ml', sku: 'BOT002', price: 5990, category: catMap.botilleria, stock: 40, unit: 'un', brand: 'Casillero del Diablo' },
  { name: 'Pisco Control 40° 750ml', slug: 'pisco-control-40-750ml', sku: 'BOT003', price: 8490, category: catMap.botilleria, stock: 25, unit: 'un', brand: 'Control' },
  { name: 'Ron Appleton 700ml', slug: 'ron-appleton-700ml', sku: 'BOT004', price: 12990, category: catMap.botilleria, stock: 15, unit: 'un', brand: 'Appleton' },
  { name: 'Sidra Watts 750ml', slug: 'sidra-watts-750ml', sku: 'BOT005', price: 2990, category: catMap.botilleria, stock: 50, unit: 'un', brand: 'Watts' },

  // Chocolates (5)
  { name: 'Chocolate Sublime 50g', slug: 'chocolate-sublime-50g', sku: 'CHO001', price: 1190, category: catMap.chocolates, stock: 200, unit: 'un', brand: 'Nestlé', isFeatured: true },
  { name: 'Kit Kat 45g', slug: 'kit-kat-45g', sku: 'CHO002', price: 990, category: catMap.chocolates, stock: 150, unit: 'un', brand: 'Nestlé' },
  { name: 'Hersheys 40g', slug: 'hersheys-40g', sku: 'CHO003', price: 1090, category: catMap.chocolates, stock: 100, unit: 'un', brand: "Hershey's" },
  { name: 'Trencito 50g', slug: 'trencito-50g', sku: 'CHO004', price: 890, category: catMap.chocolates, stock: 180, unit: 'un', brand: 'Nestlé' },
  { name: 'Super 8 x3 unidades', slug: 'super-8-x3', sku: 'CHO005', price: 1290, category: catMap.chocolates, stock: 90, unit: 'paq', brand: 'Costa' },

  // Lácteos (5)
  { name: 'Leche entera 1L', slug: 'leche-entera-1l', sku: 'LAC001', price: 1190, category: catMap['lacteos-fiambres-y-huevos'], stock: 100, unit: 'lt', brand: 'Soprole', isFeatured: true },
  { name: 'Queso Gauda en láminas 150g', slug: 'queso-gauda-laminas-150g', sku: 'LAC002', price: 2490, category: catMap['lacteos-fiambres-y-huevos'], stock: 40, unit: 'un', brand: 'Colún' },
  { name: 'Jamón de Pierna 100g', slug: 'jamon-de-pierna-100g', sku: 'LAC003', price: 1890, category: catMap['lacteos-fiambres-y-huevos'], stock: 35, unit: 'un', brand: 'Loncoleche' },
  { name: 'Yogur Activia Natural 160g', slug: 'yogur-activia-natural-160g', sku: 'LAC004', price: 890, category: catMap['lacteos-fiambres-y-huevos'], stock: 60, unit: 'un', brand: 'Danone' },
  { name: 'Huevos L x12 unidades', slug: 'huevos-l-x12', sku: 'LAC005', price: 3490, category: catMap['lacteos-fiambres-y-huevos'], stock: 80, unit: 'un', brand: 'Súper Pollo', isFeatured: true },
]

// ─── Comunas RM ────────────────────────────────────────────────────────────────
const COMMUNES = [
  { commune: 'Providencia', cost: 2990 },
  { commune: 'Las Condes', cost: 2990 },
  { commune: 'Ñuñoa', cost: 2990 },
  { commune: 'Santiago Centro', cost: 2490 },
  { commune: 'Vitacura', cost: 3490 },
  { commune: 'Lo Barnechea', cost: 3990 },
  { commune: 'La Reina', cost: 2990 },
  { commune: 'Macul', cost: 2990 },
  { commune: 'San Miguel', cost: 2490 },
  { commune: 'La Florida', cost: 2990 },
  { commune: 'Peñalolén', cost: 2990 },
  { commune: 'La Granja', cost: 2990 },
  { commune: 'San Joaquín', cost: 2990 },
  { commune: 'Pedro Aguirre Cerda', cost: 2490 },
  { commune: 'Lo Espejo', cost: 2490 },
  { commune: 'El Bosque', cost: 2990 },
  { commune: 'La Cisterna', cost: 2990 },
  { commune: 'San Ramón', cost: 3490 },
  { commune: 'Lo Prado', cost: 2990 },
  { commune: 'Cerro Navia', cost: 2990 },
  { commune: 'Pudahuel', cost: 3490 },
  { commune: 'Maipú', cost: 3490 },
  { commune: 'Cerrillos', cost: 2990 },
  { commune: 'Estación Central', cost: 2490 },
  { commune: 'Recoleta', cost: 2490 },
  { commune: 'La Pintana', cost: 2990 },
]

export const seedDatabase = async (): Promise<void> => {
  console.log('🌱 Iniciando seed...')

  const categoriesCount = await Category.countDocuments()

  if (categoriesCount > 0) {
    console.log('🌱 Base de datos ya poblada. Seed omitido.')
    return
  }

  // Categorías
  const cats = await Category.insertMany(CATEGORIES)

  const catMap = Object.fromEntries(
    cats.map((c) => [c.slug, String(c._id)])
  )

  console.log(`📦 ${cats.length} categorías creadas`)

  // Productos
  const products = buildProducts(catMap)

  await Product.insertMany(products)

  console.log(`🛒 ${products.length} productos creados`)

  // Comunas
  const zones = COMMUNES.map((c) => ({
    ...c,
    region: 'Región Metropolitana',
    isAvailable: true
  }))

  await ShippingZone.insertMany(zones)

  console.log(`🚚 ${zones.length} comunas creadas`)

  // Admin
  const existingAdmin = await User.findOne({
    email: 'admin@americo.cl'
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(
      'Admin1234!',
      10
    )

    await User.create({
      name: 'Administrador AMERICO',
      email: 'admin@americo.cl',
      passwordHash,
      role: 'admin'
    })

    console.log(
      '👤 Admin creado — admin@americo.cl / Admin1234!'
    )
  }

  console.log('✅ Seed completado')
}