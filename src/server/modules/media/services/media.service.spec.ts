// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
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
  createTextAsJpg,
} from '@/test/image-fixtures'

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

  it('Given a stored object, should delete it', async () => {
    const { key } = await service.processProfilePhoto(
      toFile(await createPng(), 'a.png', 'image/png'),
    )

    await service.deleteObject(key)

    expect(await driver.get(key)).toBeNull()
  })
})
