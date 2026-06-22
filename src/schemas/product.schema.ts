import { z } from 'zod'

export const CreateProductSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().optional(),
  sku: z.string().min(1, 'El SKU es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  price: z.number().int('El precio debe ser un entero en CLP').positive('El precio debe ser positivo'),
  originalPrice: z.number().int().positive().optional(),
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  lowStockThreshold: z.number().int().min(0).optional().default(5),
  unit: z.enum(['un', 'kg', 'lt', 'paq']),
  brand: z.string().optional(),
  shortDescription: z.string().max(200).optional(),
  description: z.string().optional(),
  images: z.array(z.object({ url: z.string().max(500000), alt: z.string().default('') })).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  barcode: z.string().optional(),
})

export const UpdateProductSchema = CreateProductSchema.partial()

export const UpdateStockSchema = z.object({
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
})
