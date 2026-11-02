import { describe, expect, it } from 'vitest'

import { readJpegExif, withJpegExif } from './jpeg-exif'

const SOI = [0xff, 0xd8]
const APP0 = [0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46]
const SCAN = [0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]
const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
const VALUE_INDEX = 28

const toExifSegment = (isLittleEndian: boolean, orientation: number): number[] => {
  const tiff = isLittleEndian
    ? [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]
    : [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]
  const count = isLittleEndian ? [0x01, 0x00] : [0x00, 0x01]
  const entry = isLittleEndian
    ? [0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00]
    : [0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00]
  const body = [...EXIF_HEADER, ...tiff, ...count, ...entry, 0x00, 0x00, 0x00, 0x00]
  return [0xff, 0xe1, 0x00, body.length + 2, ...body]
}

const toJpeg = (...parts: number[][]): Blob =>
  new Blob([new Uint8Array(parts.flat())], { type: 'image/jpeg' })

const toBytes = async (blob: Blob): Promise<number[]> =>
  Array.from(new Uint8Array(await blob.arrayBuffer()))

describe('readJpegExif', () => {
  it('Given a big-endian JPEG rotated by EXIF, should return its EXIF block marked upright', async () => {
    const segment = toExifSegment(false, 6)

    const result = await readJpegExif(toJpeg(SOI, APP0, segment, SCAN))

    expect(Array.from(result ?? [])).toEqual(segment.with(VALUE_INDEX + 1, 1))
  })

  it('Given a little-endian JPEG rotated by EXIF, should return its EXIF block marked upright', async () => {
    const segment = toExifSegment(true, 8)

    const result = await readJpegExif(toJpeg(SOI, segment, SCAN))

    expect(Array.from(result ?? [])).toEqual(segment.with(VALUE_INDEX, 1))
  })

  it('Given a JPEG without EXIF, should return null', async () => {
    expect(await readJpegExif(toJpeg(SOI, APP0, SCAN))).toBeNull()
  })

  it('Given a file that is not a JPEG, should return null', async () => {
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...toExifSegment(false, 6)])])

    expect(await readJpegExif(png)).toBeNull()
  })
})

describe('withJpegExif', () => {
  it('Given an encoded JPEG, should insert the EXIF block right after its start marker', async () => {
    const segment = toExifSegment(false, 1)

    const result = await withJpegExif(toJpeg(SOI, SCAN), new Uint8Array(segment))

    expect(result.type).toBe('image/jpeg')
    expect(await toBytes(result)).toEqual([...SOI, ...segment, ...SCAN])
  })

  it('Given an encoding that is not a JPEG, should return it unchanged', async () => {
    const webp = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' })

    expect(await withJpegExif(webp, new Uint8Array(toExifSegment(false, 1)))).toBe(webp)
  })
})
