import sharp, { type Sharp } from 'sharp'

import { Models } from '@/models'

import { env } from '@/server/config/env'
import { PayloadTooLargeError, ValidationError } from '@/server/errors/http-errors'
import { createStorageKey, storage, type StorageDriver } from '@/server/lib/storage'

import { inspectVideo } from './video'

const ALLOWED_FORMATS: readonly string[] = Models.IMAGE_UPLOAD_TYPES.map((type) =>
  type.replace('image/', ''),
)
const DEFAULT_MAX_INPUT_PIXELS = 50_000_000
const POST_IMAGE_MAX_EDGE = 2560
const POST_IMAGE_QUALITY = 85
const POST_IMAGE_PREFIX = 'posts'
const POST_IMAGE_EXTENSION = 'webp'
const POST_IMAGE_CONTENT_TYPE = 'image/webp'
const VARIANT_WIDTHS: Record<Models.ImageVariantName, number> = {
  w480: 480,
  w960: 960,
  w1600: 1600,
}
const PROFILE_PHOTO_SIZE = 1024
const PROFILE_PHOTO_QUALITY = 85
const PROFILE_PHOTO_PREFIX = 'profile'
const PROFILE_PHOTO_EXTENSION = 'webp'
const PROFILE_PHOTO_CONTENT_TYPE = 'image/webp'

type MediaServiceDependencies = {
  storage: StorageDriver
  getMaxBytes: () => number
  getMaxPixels?: () => number
  getMaxVideoBytes?: () => number
}

export type ProcessedImageVariant = {
  name: Models.ImageVariantName
  key: string
  width: number
  height: number
  contentType: typeof POST_IMAGE_CONTENT_TYPE
}

export type ProcessedImage = {
  key: string
  contentType: typeof POST_IMAGE_CONTENT_TYPE
  width: number
  height: number
  size: number
  variants: ProcessedImageVariant[]
}

export type ProcessedVideo = {
  key: string
  contentType: 'video/mp4' | 'video/webm'
  width: number
  height: number
  size: number
}

type RenderedImage = { data: Uint8Array; width: number; height: number }

const toRendered = async (pipeline: Sharp): Promise<RenderedImage> => {
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
  return { data: new Uint8Array(data), width: info.width, height: info.height }
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

  processPostVideo = async (file: File): Promise<ProcessedVideo> => {
    if (file.size > (this.dependencies.getMaxVideoBytes?.() ?? env.UPLOAD_MAX_VIDEO_BYTES)) {
      throw new PayloadTooLargeError('Video is too large')
    }
    if (file.size === 0) {
      throw new ValidationError('A video file is required')
    }
    const input = new Uint8Array(await file.arrayBuffer())
    const metadata = await inspectVideo(input)
    const extension = metadata.contentType === 'video/mp4' ? 'mp4' : 'webm'
    const key = createStorageKey('videos', extension)
    await this.dependencies.storage.put(key, input, metadata.contentType)
    return { ...metadata, key, size: input.byteLength }
  }

  deleteObjects = async (keys: string[]): Promise<void> => {
    await Promise.allSettled(keys.map((key) => this.dependencies.storage.delete(key)))
  }

  processPostImage = async (file: File): Promise<ProcessedImage> => {
    if (file.size > this.dependencies.getMaxBytes()) {
      throw new PayloadTooLargeError('Image is too large')
    }
    const input = Buffer.from(await file.arrayBuffer())
    const rendered = await this.renderPostImage(input)
    const written: string[] = []
    try {
      const key = await this.putPostObject(rendered.full.data, written)
      const variants: ProcessedImageVariant[] = []
      for (const variant of rendered.variants) {
        variants.push({
          name: variant.name,
          key: await this.putPostObject(variant.data, written),
          width: variant.width,
          height: variant.height,
          contentType: POST_IMAGE_CONTENT_TYPE,
        })
      }
      return {
        key,
        contentType: POST_IMAGE_CONTENT_TYPE,
        width: rendered.full.width,
        height: rendered.full.height,
        size: rendered.full.data.byteLength,
        variants,
      }
    } catch (error) {
      await this.deleteObjects(written)
      throw error
    }
  }

  private putPostObject = async (data: Uint8Array, written: string[]): Promise<string> => {
    const key = createStorageKey(POST_IMAGE_PREFIX, POST_IMAGE_EXTENSION)
    await this.dependencies.storage.put(key, data, POST_IMAGE_CONTENT_TYPE)
    written.push(key)
    return key
  }

  private renderPostImage = async (
    input: Buffer,
  ): Promise<{
    full: RenderedImage
    variants: (RenderedImage & { name: Models.ImageVariantName })[]
  }> => {
    try {
      const maxPixels = this.dependencies.getMaxPixels?.() ?? DEFAULT_MAX_INPUT_PIXELS
      const source = sharp(input, { limitInputPixels: maxPixels })
      const { format } = await source.metadata()
      if (!format || !ALLOWED_FORMATS.includes(format)) {
        throw new ValidationError('Unsupported image type')
      }
      const full = await toRendered(
        source
          .rotate()
          .resize({
            width: POST_IMAGE_MAX_EDGE,
            height: POST_IMAGE_MAX_EDGE,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: POST_IMAGE_QUALITY }),
      )
      const variants = []
      for (const name of Models.IMAGE_VARIANT_NAMES) {
        const width = VARIANT_WIDTHS[name]
        if (full.width < width) {
          continue
        }
        const rendered = await toRendered(
          sharp(full.data).resize({ width }).webp({ quality: POST_IMAGE_QUALITY }),
        )
        variants.push({ ...rendered, name })
      }
      return { full, variants }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError('Invalid image')
    }
  }

  private toProfilePhoto = async (input: Buffer): Promise<Uint8Array> => {
    try {
      const image = sharp(input, { limitInputPixels: DEFAULT_MAX_INPUT_PIXELS })
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
  getMaxPixels: () => env.UPLOAD_MAX_IMAGE_PIXELS,
  getMaxVideoBytes: () => env.UPLOAD_MAX_VIDEO_BYTES,
})
