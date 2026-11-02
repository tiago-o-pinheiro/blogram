import { readJpegExif, withJpegExif } from './jpeg-exif'

const ENCODE_QUALITY = 0.9
const KEEP_BELOW_BYTES = 1_500_000
const WEBP = { type: 'image/webp', extension: 'webp' } as const
const JPEG = { type: 'image/jpeg', extension: 'jpg' } as const
const ENCODINGS = [WEBP, JPEG] as const
const EXIF_ENCODINGS = [JPEG] as const

type Encoding = (typeof ENCODINGS)[number]

type Encoded = { blob: Blob; extension: string }

const decode = (file: File): Promise<ImageBitmap | null> =>
  typeof createImageBitmap === 'function'
    ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null)
    : Promise.resolve(null)

const toBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, ENCODE_QUALITY))

const encode = async (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  encodings: readonly Encoding[],
): Promise<Encoded | null> => {
  for (const encoding of encodings) {
    if (encoding.type === 'image/jpeg') {
      context.globalCompositeOperation = 'destination-over'
      context.fillStyle = 'white'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    const blob = await toBlob(canvas, encoding.type)
    if (blob?.type === encoding.type) {
      return { blob, extension: encoding.extension }
    }
  }
  return null
}

const toFileName = (name: string, extension: string): string =>
  `${name.replace(/\.[^./]+$/, '') || 'photo'}.${extension}`

export const shrinkImage = async (file: File, maxEdge: number): Promise<File> => {
  const bitmap = await decode(file)
  if (!bitmap) {
    return file
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  const context = scale === 1 && file.size <= KEEP_BELOW_BYTES ? null : canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const exif = await readJpegExif(file).catch(() => null)
  const encoded = await encode(canvas, context, exif ? EXIF_ENCODINGS : ENCODINGS)
  if (!encoded) {
    return file
  }
  const blob = exif ? await withJpegExif(encoded.blob, exif) : encoded.blob
  if (blob.size >= file.size) {
    return file
  }
  return new File([blob], toFileName(file.name, encoded.extension), {
    type: blob.type,
    lastModified: file.lastModified,
  })
}
