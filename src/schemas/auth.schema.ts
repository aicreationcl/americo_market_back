import { z } from 'zod'

export const RegisterSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const UpdateMeSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  phone: z.string().min(8, 'Teléfono inválido').optional(),
  profileImage: z.string().max(200000, 'Imagen demasiado grande').optional(),
})

export const AddressSchema = z.object({
  alias: z.string().min(1).max(50).default('Casa'),
  street: z.string().min(1, 'Calle requerida'),
  number: z.string().min(1, 'Número requerido'),
  commune: z.string().min(1, 'Comuna requerida'),
  region: z.string().default('Región Metropolitana'),
  additionalInfo: z.string().max(200).optional(),
})

export const UpdateAddressSchema = AddressSchema.partial()
