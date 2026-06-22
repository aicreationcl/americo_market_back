import { z } from 'zod'

export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url('URL de imagen inválida').optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional().default(0),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()
