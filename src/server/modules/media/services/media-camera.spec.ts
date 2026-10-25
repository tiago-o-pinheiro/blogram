// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createLocalDriver } from '@/server/lib/storage/local-driver'
import { MediaService } from '@/server/modules/media/services/media.service'

const MAX_BYTES = 1_000_000

const toFile = (bytes: Uint8Array<ArrayBufferLike>, name: string, type: string) =>
  new File([new Uint8Array(bytes)], name, { type })

const createCameraJpeg = (exifPhoto: Record<string, string>) =>
  sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 90, g: 90, b: 200 } },
  })
    .withExif({
      IFD0: { Make: 'FUJIFILM', Model: 'X100V' },
      IFD2: exifPhoto,
    })
    .jpeg()
    .toBuffer()

describe('MediaService camera details', () => {
  let directory: string
  let service: MediaService

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-media-camera-'))
    service = new MediaService({
      storage: createLocalDriver(directory),
      getMaxBytes: () => MAX_BYTES,
    })
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('BH-1: Given a manual lens with zero focal length and aperture, should keep the other camera details', async () => {
    const file = toFile(
      await createCameraJpeg({
        FocalLength: '0/1',
        FNumber: '0/1',
        ISOSpeedRatings: '200',
        DateTimeOriginal: '2026:05:03 10:20:30',
      }),
      'manual-lens.jpg',
      'image/jpeg',
    )

    const { metadata } = await service.processPostImage(file)

    expect(metadata.camera).toEqual({
      make: 'FUJIFILM',
      model: 'X100V',
      iso: 200,
      takenOn: '2026-05-03',
    })
  })

  it('BH-2: Given a zeroed date taken, should not report a date', async () => {
    const file = toFile(
      await createCameraJpeg({ DateTimeOriginal: '0000:00:00 00:00:00', ISOSpeedRatings: '200' }),
      'no-date.jpg',
      'image/jpeg',
    )

    const { metadata } = await service.processPostImage(file)

    expect(metadata.camera).toEqual({ make: 'FUJIFILM', model: 'X100V', iso: 200 })
  })
})
