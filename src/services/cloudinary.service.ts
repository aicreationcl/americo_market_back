import { v2 as cloudinary } from 'cloudinary'
import { config } from '../config'
import { ApiError } from '../utils/ApiError'

export const getCloudinaryClient = () => {
  if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
    throw new ApiError(503, 'Cloudinary no está configurado. Agrega CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.')
  }
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  })
  return cloudinary
}

export const uploadProductImage = async (
  buffer: Buffer,
  originalName: string
): Promise<{ url: string; publicId: string }> => {
  const client = getCloudinaryClient()

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: 'americo/products',
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        public_id: `product_${Date.now()}_${originalName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'))
        resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )
    stream.end(buffer)
  })
}

export const deleteProductImage = async (publicId: string): Promise<void> => {
  const client = getCloudinaryClient()
  await client.uploader.destroy(publicId)
}
