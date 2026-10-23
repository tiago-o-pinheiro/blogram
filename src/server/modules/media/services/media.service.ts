import sharp from 'sharp'

import { env } from '@/server/config/env'
import { PayloadTooLargeError, ValidationError } from '@/server/errors/http-errors'
import { createStorageKey, storage, type StorageDriver } from '@/server/lib/storage'

const ALLOWED_FORMATS = ['jpeg', 'png', 'webp']
const MAX_INPUT_PIXELS = 50_000_000
const PROFILE_PHOTO_SIZE = 1024
const PROFILE_PHOTO_QUALITY = 85
const PROFILE_PHOTO_PREFIX = 'profile'
const PROFILE_PHOTO_EXTENSION = 'webp'
const PROFILE_PHOTO_CONTENT_TYPE = 'image/webp'

type MediaServiceDependencies = {
  storage: StorageDriver
  getMaxBytes: () => number
}

export class MediaService {
  constructor(private readonly dependencies: MediaServiceDependencies) {}

  processProfilePhoto = async (
    file: File,
  ): Promise<{ key: string; contentType: typeof PROFILE_PHOTO_CONTENT_TYPE }> => {
    if (file.size > this.dependencies.getMaxBytes()) {
      throw new PayloadTooLargeError('Image is too large')
    }
    const input = Buffer.from(await file.arrayBuffer())
    const output = await this.toProfilePhoto(input)
    const key = createStorageKey(PROFILE_PHOTO_PREFIX, PROFILE_PHOTO_EXTENSION)
    await this.dependencies.storage.put(key, output, PROFILE_PHOTO_CONTENT_TYPE)
    return { key, contentType: PROFILE_PHOTO_CONTENT_TYPE }
  }

  deleteObject = (key: string): Promise<void> => this.dependencies.storage.delete(key)

  private toProfilePhoto = async (input: Buffer): Promise<Uint8Array> => {
    try {
      const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      const { format } = await image.metadata()
      if (!format || !ALLOWED_FORMATS.includes(format)) {
        throw new ValidationError('Unsupported image type')
      }
      const output = await image
        .rotate()
        .resize(PROFILE_PHOTO_SIZE, PROFILE_PHOTO_SIZE, { fit: 'cover' })
        .webp({ quality: PROFILE_PHOTO_QUALITY })
        .toBuffer()
      return new Uint8Array(output)
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError('Invalid image')
    }
  }
}

export const mediaService = new MediaService({
  storage,
  getMaxBytes: () => env.UPLOAD_MAX_IMAGE_BYTES,
})
