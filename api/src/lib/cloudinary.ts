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

export function extractPublicId(url: string): string {
  // https://res.cloudinary.com/cloud/image/upload/v123456/manahau/folder/file.jpg
  const parts = url.split('/upload/')
  if (parts.length < 2) return ''
  const afterUpload = parts[1].replace(/^v\d+\//, '') // remove version prefix
  return afterUpload.replace(/\.[^/.]+$/, '')          // remove extension
}
