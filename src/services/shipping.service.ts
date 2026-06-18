import ShippingZone from '../models/ShippingZone'
import { ApiError } from '../utils/ApiError'
import { config } from '../config'

export interface ShippingResult {
  cost: number
  isFree: boolean
  message: string
}

export interface PickupStore {
  id: string
  name: string
  address: string
  commune: string
  region: string
  hours: string
  phone: string
}

export const calculateShipping = async (
  commune: string,
  cartTotal: number
): Promise<ShippingResult> => {
  const zone = await ShippingZone.findOne({
    commune: new RegExp(`^${commune}$`, 'i'),
    isAvailable: true,
  })

  if (!zone) {
    throw new ApiError(400, `Despacho no disponible para la comuna: ${commune}`)
  }

  if (cartTotal >= config.FREE_SHIPPING_THRESHOLD) {
    return {
      cost: 0,
      isFree: true,
      message: `¡Envío gratis en compras sobre $${config.FREE_SHIPPING_THRESHOLD.toLocaleString('es-CL')}!`,
    }
  }

  return {
    cost: zone.cost,
    isFree: false,
    message: `Costo de envío a ${zone.commune}`,
  }
}

export const getAvailableCommunes = async () => {
  return ShippingZone.find({ isAvailable: true })
    .select('commune region cost')
    .sort({ commune: 1 })
}

export const getPickupStores = (): PickupStore[] => [
  {
    id: 'main',
    name: 'AMERICO Minimarket',
    address: 'Av. Principal 123',
    commune: 'Santiago',
    region: 'Región Metropolitana',
    hours: 'Lun–Sáb 8:00–22:00, Dom 9:00–20:00',
    phone: '+56 2 2345 6789',
  },
]
