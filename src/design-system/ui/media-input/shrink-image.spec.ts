import { afterEach, describe, expect, it, vi } from 'vitest'

import { shrinkImage } from './shrink-image'

const MAX_EDGE = 2560
const LARGE_BYTES = 12_000_000

type Picture = { width: number; height: number }

const toPhoto = (name: string, size: number, type = 'image/jpeg') => {
  const file = new File(['::bytes::'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const stubDecoder = (picture: Picture) => {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve({ ...picture, close })),
  )
  return close
}

const stubCanvas = (output: Blob) => {
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return Object.assign(Object.create(null), {
      canvas: this,
      drawImage,
      fillRect: vi.fn(),
    })
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) =>
    callback(type === output.type ? output : null),
  )
  return drawImage
}

const toBlobOf = (size: number, type = 'image/webp') => {
  const blob = new Blob(['::encoded::'], { type })
  Object.defineProperty(blob, 'size', { value: size })
  return blob
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('shrinkImage', () => {
  it('Given a large camera photo, should scale its longest edge down to the limit', async () => {
    stubDecoder({ width: 8160, height: 6120 })
    const drawImage = stubCanvas(toBlobOf(1_200_000))

    const result = await shrinkImage(toPhoto('IMG_0001.jpg', LARGE_BYTES), MAX_EDGE)

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2560, 1920)
    expect(result.name).toBe('IMG_0001.webp')
    expect(result.type).toBe('image/webp')
  })

  it('Given a browser that cannot write WebP, should fall back to JPEG', async () => {
    stubDecoder({ width: 4000, height: 3000 })
    stubCanvas(toBlobOf(900_000, 'image/jpeg'))

    const result = await shrinkImage(toPhoto('beach.png', LARGE_BYTES, 'image/png'), MAX_EDGE)

    expect(result.name).toBe('beach.jpg')
    expect(result.type).toBe('image/jpeg')
  })

  it('Given a small photo already within the limit, should keep the original file', async () => {
    const close = stubDecoder({ width: 1200, height: 900 })
    const file = toPhoto('small.jpg', 400_000)

    const result = await shrinkImage(file, MAX_EDGE)

    expect(result).toBe(file)
    expect(close).toHaveBeenCalledOnce()
  })

  it('Given an encoding that comes out heavier, should keep the original file', async () => {
    stubDecoder({ width: 3000, height: 2000 })
    stubCanvas(toBlobOf(LARGE_BYTES + 1))
    const file = toPhoto('dense.jpg', LARGE_BYTES)

    const result = await shrinkImage(file, MAX_EDGE)

    expect(result).toBe(file)
  })

  it('Given an image the browser cannot decode, should keep the original file', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.reject(new Error('decode'))),
    )
    const file = toPhoto('broken.jpg', LARGE_BYTES)

    const result = await shrinkImage(file, MAX_EDGE)

    expect(result).toBe(file)
  })
})
