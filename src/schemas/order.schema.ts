import { z } from 'zod'

const CustomerDataSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  rut: z.string().optional(),
})

const AddressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  commune: z.string().min(1, 'La comuna es requerida'),
  region: z.string().optional().default('Región Metropolitana'),
  additionalInfo: z.string().optional(),
})

const FulfillmentDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('delivery'),
    shippingCost: z.number().int().min(0).optional().default(0),
    address: AddressSchema,
    estimatedDate: z.coerce.date().optional(),
  }),
  z.object({
    type: z.literal('pickup'),
    shippingCost: z.number().int().min(0).optional().default(0),
    pickupStore: z
      .object({
        name: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
    estimatedDate: z.coerce.date().optional(),
  }),
])

export const PlaceOrderSchema = z.object({
  customerData: CustomerDataSchema,
  fulfillmentData: FulfillmentDataSchema,
  paymentMethod: z
    .enum(['cash_on_delivery', 'cash_on_pickup', 'webpay', 'mercadopago'])
    .optional()
    .default('cash_on_delivery'),
  notes: z.string().max(500).optional(),
})

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    'pending_payment',
    'payment_confirmed',
    'preparing',
    'ready_for_pickup',
    'in_transit',
    'delivered',
    'cancelled',
    'refunded',
  ]),
  note: z.string().optional(),
})

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['customer', 'admin'], {
    errorMap: () => ({ message: 'El rol debe ser "customer" o "admin"' }),
  }),
})
