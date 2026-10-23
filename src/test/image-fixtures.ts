import sharp from 'sharp'

const SIZE = 64

const toRawImage = () =>
  sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 200, g: 40, b: 40 } },
  })

export const createJpegWithGps = (): Promise<Buffer> =>
  toRawImage()
    .withExif({
      IFD0: { Copyright: 'blogram-fixture' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 24/1 0/1', GPSLongitudeRef: 'E' },
    })
    .jpeg()
    .toBuffer()

export const createWideJpegWithGps = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 120, b: 200 } },
  })
    .withExif({
      IFD0: { Copyright: 'blogram-fixture' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 24/1 0/1', GPSLongitudeRef: 'E' },
    })
    .jpeg()
    .toBuffer()

export const createRotatedJpeg = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 200, b: 120 } },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer()

export const createPng = (): Promise<Buffer> => toRawImage().png().toBuffer()

export const createTextAsJpg = (): Buffer => Buffer.from('this is plain text, not an image')

export const createOversizeBuffer = (bytes: number): Buffer => Buffer.alloc(bytes + 1, 1)
