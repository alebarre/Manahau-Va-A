import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

export async function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: `manahau/${folder}` }, (error, result) => {
        if (error || !result) return reject(error)
        resolve(result.secure_url)
      })
      .end(buffer)
  })
}

export async function deleteImage(publicId: string) {
  await cloudinary.uploader.destroy(publicId)
}
