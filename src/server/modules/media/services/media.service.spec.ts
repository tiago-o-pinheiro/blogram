// @vitest-environment node
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PayloadTooLargeError, ValidationError } from '@/server/errors/http-errors'
import { createLocalDriver } from '@/server/lib/storage/local-driver'
import { MediaService } from '@/server/modules/media/services/media.service'
import {
  createJpegWithGps,
  createOversizeBuffer,
  createPng,
  createRotatedJpeg,
  createTextAsJpg,
  createWideJpegWithGps,
} from '@/test/image-fixtures'
import { createWebm } from '@/test/video-fixtures'

const MAX_BYTES = 1_000_000

const toFile = (bytes: Uint8Array<ArrayBufferLike>, name: string, type: string) =>
  new File([new Uint8Array(bytes)], name, { type })

describe('MediaService', () => {
  let directory: string
  let service: MediaService
  let driver: ReturnType<typeof createLocalDriver>

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-media-'))
    driver = createLocalDriver(directory)
    service = new MediaService({ storage: driver, getMaxBytes: () => MAX_BYTES })
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('Given a jpeg with GPS EXIF, should store a webp without metadata under a server-made key', async () => {
    const file = toFile(await createJpegWithGps(), 'holiday.jpg', 'image/jpeg')

    const { key, contentType } = await service.processProfilePhoto(file)

    expect(key).toMatch(/^profile\/[0-9a-f-]{36}\.webp$/)
    expect(contentType).toBe('image/webp')
    const stored = await driver.get(key)
    const metadata = await sharp(stored?.body).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.exif).toBeUndefined()
  })

  it('Given a png, should accept it and resize within 1024 pixels', async () => {
    const { key } = await service.processProfilePhoto(
      toFile(await createPng(), 'a.png', 'image/png'),
    )

    const metadata = await sharp((await driver.get(key))?.body).metadata()

    expect(metadata.width).toBe(1024)
    expect(metadata.height).toBe(1024)
  })

  it('Given text named as jpg, should reject with ValidationError and store nothing', async () => {
    const file = toFile(createTextAsJpg(), 'fake.jpg', 'image/jpeg')

    await expect(service.processProfilePhoto(file)).rejects.toBeInstanceOf(ValidationError)
  })

  it('Given a gif, should reject with ValidationError', async () => {
    const gif = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .gif()
      .toBuffer()

    await expect(
      service.processProfilePhoto(toFile(gif, 'a.gif', 'image/gif')),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('Given an oversize file, should reject with PayloadTooLargeError', async () => {
    const file = toFile(createOversizeBuffer(MAX_BYTES), 'big.jpg', 'image/jpeg')

    await expect(service.processProfilePhoto(file)).rejects.toBeInstanceOf(PayloadTooLargeError)
  })

  it('Given a valid vertical video, should preserve its bytes and dimensions', async () => {
    const bytes = await createWebm()

    const video = await service.processPostVideo(toFile(bytes, 'clip.webm', 'video/webm'))

    expect(video).toMatchObject({
      width: 64,
      height: 96,
      contentType: 'video/webm',
      size: bytes.byteLength,
    })
    expect((await driver.get(video.key))?.body).toEqual(bytes)
  })

  it('Given video bytes above the configured limit, should reject before storing them', async () => {
    const limited = new MediaService({
      storage: driver,
      getMaxBytes: () => MAX_BYTES,
      getMaxVideoBytes: () => 10,
    })

    await expect(
      limited.processPostVideo(toFile(new Uint8Array(11), 'clip.webm', 'video/webm')),
    ).rejects.toBeInstanceOf(PayloadTooLargeError)
  })

  describe('processPostImage', () => {
    const listStoredFiles = async () =>
      (await readdir(directory, { recursive: true, withFileTypes: true })).filter((entry) =>
        entry.isFile(),
      )

    const createCameraJpeg = () =>
      sharp({
        create: { width: 64, height: 64, channels: 3, background: { r: 90, g: 90, b: 200 } },
      })
        .withExif({
          IFD0: { Make: 'FUJIFILM', Model: 'X100V' },
          IFD2: {
            LensModel: 'Fixed 23mm',
            FocalLength: '23/1',
            FNumber: '2/1',
            ExposureTime: '1/250',
            ISOSpeedRatings: '200',
            DateTimeOriginal: '2026:05:03 10:20:30',
            BodySerialNumber: 'SERIAL-123',
          },
          IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 24/1 0/1', GPSLongitudeRef: 'E' },
        })
        .jpeg()
        .toBuffer()

    it('Given a jpeg with camera EXIF, should return only the whitelisted details', async () => {
      const file = toFile(await createCameraJpeg(), 'camera.jpg', 'image/jpeg')

      const { metadata } = await service.processPostImage(file)

      expect(metadata.camera).toEqual({
        make: 'FUJIFILM',
        model: 'X100V',
        lens: 'Fixed 23mm',
        focalLength: 23,
        aperture: 2,
        exposure: 0.004,
        iso: 200,
        takenOn: '2026-05-03',
      })
      expect(JSON.stringify(metadata)).not.toContain('SERIAL-123')
    })

    it('Given a jpeg without camera EXIF, should return no camera details', async () => {
      const { metadata } = await service.processPostImage(
        toFile(await createPng(), 'a.png', 'image/png'),
      )

      expect(metadata.camera).toBeUndefined()
    })

    it('Given a photo, should return a small blurred webp placeholder', async () => {
      const { metadata } = await service.processPostImage(
        toFile(await createCameraJpeg(), 'camera.jpg', 'image/jpeg'),
      )

      expect(metadata.placeholder).toMatch(/^data:image\/webp;base64,/)
      expect(metadata.placeholder?.length).toBeLessThanOrEqual(1024)
    })

    it('Given a wide jpeg with GPS, should store full and variants as webp without metadata', async () => {
      const file = toFile(await createWideJpegWithGps(2000, 1000), 'wide.jpg', 'image/jpeg')

      const result = await service.processPostImage(file)

      expect(result.key).toMatch(/^posts\/[0-9a-f-]{36}\.webp$/)
      expect(result.contentType).toBe('image/webp')
      expect(result.width).toBe(2000)
      expect(result.height).toBe(1000)
      expect(result.variants.map((variant) => variant.name)).toEqual(['w480', 'w960', 'w1600'])
      const keys = [result.key, ...result.variants.map((variant) => variant.key)]
      for (const key of keys) {
        const metadata = await sharp((await driver.get(key))?.body).metadata()
        expect(metadata.format).toBe('webp')
        expect(metadata.exif).toBeUndefined()
      }
      expect(result.variants.map((variant) => variant.width)).toEqual([480, 960, 1600])
      expect(result.variants.map((variant) => variant.height)).toEqual([240, 480, 800])
      expect(result.size).toBe((await driver.get(result.key))?.size)
    })

    it('Given a small image, should never upscale and create no variants', async () => {
      const result = await service.processPostImage(
        toFile(await createPng(), 'small.png', 'image/png'),
      )

      expect(result.width).toBe(64)
      expect(result.height).toBe(64)
      expect(result.variants).toEqual([])
    })

    it('Given an image of 1000 pixels wide, should only create the variants it can fill', async () => {
      const file = toFile(await createWideJpegWithGps(1000, 500), 'mid.jpg', 'image/jpeg')

      const result = await service.processPostImage(file)

      expect(result.variants.map((variant) => variant.name)).toEqual(['w480', 'w960'])
    })

    it('Given an image larger than 2560 pixels, should cap the long edge', async () => {
      const file = toFile(await createWideJpegWithGps(3000, 1500), 'huge.jpg', 'image/jpeg')

      const result = await service.processPostImage(file)

      expect(result.width).toBe(2560)
      expect(result.height).toBe(1280)
    })

    it('Given an EXIF orientation, should store the image upright with swapped dimensions', async () => {
      const file = toFile(await createRotatedJpeg(160, 80), 'turned.jpg', 'image/jpeg')

      const result = await service.processPostImage(file)

      expect(result.width).toBe(80)
      expect(result.height).toBe(160)
    })

    it('Given text named as jpg, should reject with ValidationError and store nothing', async () => {
      const file = toFile(createTextAsJpg(), 'fake.jpg', 'image/jpeg')

      await expect(service.processPostImage(file)).rejects.toBeInstanceOf(ValidationError)
      expect(await listStoredFiles()).toEqual([])
    })

    it('Given an oversize file, should reject with PayloadTooLargeError and store nothing', async () => {
      const file = toFile(createOversizeBuffer(MAX_BYTES), 'big.jpg', 'image/jpeg')

      await expect(service.processPostImage(file)).rejects.toBeInstanceOf(PayloadTooLargeError)
      expect(await listStoredFiles()).toEqual([])
    })

    it('Given an image above the pixel limit, should reject with ValidationError and store nothing', async () => {
      const limited = new MediaService({
        storage: driver,
        getMaxBytes: () => MAX_BYTES,
        getMaxPixels: () => 1000,
      })
      const file = toFile(await createPng(), 'pixels.png', 'image/png')

      await expect(limited.processPostImage(file)).rejects.toBeInstanceOf(ValidationError)
      expect(await listStoredFiles()).toEqual([])
    })

    it('Given a storage failure midway, should delete the objects already written', async () => {
      let writes = 0
      const failing = {
        ...driver,
        put: async (key: string, body: Uint8Array, contentType: string) => {
          writes += 1
          if (writes === 3) {
            throw new Error('disk full')
          }
          await driver.put(key, body, contentType)
        },
      }
      const flaky = new MediaService({ storage: failing, getMaxBytes: () => MAX_BYTES })
      const file = toFile(await createWideJpegWithGps(2000, 1000), 'wide.jpg', 'image/jpeg')

      await expect(flaky.processPostImage(file)).rejects.toThrow('disk full')
      expect(await listStoredFiles()).toEqual([])
    })

    it('Given stored keys, should delete them all and ignore failures', async () => {
      const result = await service.processPostImage(
        toFile(await createWideJpegWithGps(2000, 1000), 'wide.jpg', 'image/jpeg'),
      )
      const keys = [result.key, ...result.variants.map((variant) => variant.key)]

      await service.deleteObjects([...keys, 'posts/missing.webp'])

      expect(await listStoredFiles()).toEqual([])
    })
  })

  it('Given a stored object, should delete it', async () => {
    const { key } = await service.processProfilePhoto(
      toFile(await createPng(), 'a.png', 'image/png'),
    )

    await service.deleteObject(key)

    expect(await driver.get(key)).toBeNull()
  })
})
