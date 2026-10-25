// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { ConflictError, PayloadTooLargeError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { createS3Driver } from '@/server/lib/storage/s3-driver'
import { videoUpload } from '@/server/modules/media/schemas/video-upload.table'
import { createFakeS3, type FakeS3 } from '@/test/fake-s3'
import { createWebm } from '@/test/video-fixtures'

import { MediaCleanupService } from './media-cleanup.service'
import { inspectVideoUrl, type VideoProbeResult } from './video'
import { VideoUploadService } from './video-upload.service'

const HOUR_MS = 3600 * 1000
const WEBM_PROBE: VideoProbeResult = { width: 64, height: 96, contentType: 'video/webm' }

let fake: FakeS3
let clock: Date

const putPart = async (url: string, body: Uint8Array): Promise<string> => {
  const response = await fetch(url, { method: 'PUT', body: new Uint8Array(body) })
  return response.headers.get('etag') ?? ''
}

const createService = (
  overrides: {
    inspectUrl?: (url: string) => Promise<VideoProbeResult>
    maxBytes?: number
    isLocal?: boolean
  } = {},
) => {
  const driver = createS3Driver(fake.config)
  return new VideoUploadService({
    getUploads: () => (overrides.isLocal ? null : driver),
    getMaxVideoBytes: () => overrides.maxBytes ?? 1_000_000_000,
    inspectUrl: overrides.inspectUrl ?? (async () => WEBM_PROBE),
    cleanup: new MediaCleanupService(driver),
    now: () => clock,
  })
}

const uploadWhole = async (
  service: VideoUploadService,
  body: Uint8Array,
  contentType: Models.VideoUploadType = 'video/webm',
) => {
  const session = await service.start({ contentType, size: body.byteLength })
  const [part] = session.parts
  const etag = await putPart(part?.url ?? '', body)
  return { session, completion: { parts: [{ partNumber: 1, etag }] } }
}

beforeEach(async () => {
  fake = await createFakeS3()
  clock = new Date('2026-01-01T00:00:00.000Z')
})

afterEach(async () => {
  await fake.close()
})

describe('VideoUploadService.start', () => {
  it('Given the local driver, should refuse with a conflict', async () => {
    await expect(
      createService({ isLocal: true }).start({ contentType: 'video/mp4', size: 10 }),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('Given a size above the limit, should reject with payload too large', async () => {
    await expect(
      createService({ maxBytes: 100 }).start({ contentType: 'video/mp4', size: 101 }),
    ).rejects.toBeInstanceOf(PayloadTooLargeError)
    expect(fake.listUploads()).toEqual([])
  })

  it('Given a size spanning two parts, should return two presigned parts and a pending row', async () => {
    const session = await createService().start({
      contentType: 'video/mp4',
      size: Models.VIDEO_UPLOAD_PART_BYTES + 1,
    })

    expect(session.parts.map((part) => part.partNumber)).toEqual([1, 2])
    expect(session.partSize).toBe(Models.VIDEO_UPLOAD_PART_BYTES)
    expect(session.expiresAt).toBe(
      new Date(clock.getTime() + Models.VIDEO_UPLOAD_TTL_SECONDS * 1000).toISOString(),
    )
    expect(fake.listUploads()).toHaveLength(1)
    const [row] = await db.select().from(videoUpload)
    expect(row).toMatchObject({ id: session.id, status: 'pending' })
  })
})

describe('VideoUploadService.complete', () => {
  it('Given all parts uploaded, should mark the row ready and return the probe result', async () => {
    const service = createService()
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))

    expect(await service.complete(session.id, completion)).toEqual({
      id: session.id,
      contentType: 'video/webm',
      size: 3,
      width: 64,
      height: 96,
    })
    const [row] = await db.select().from(videoUpload)
    expect(row?.status).toBe('ready')
  })

  it('Given a ready upload, should return the stored result without probing again', async () => {
    let probes = 0
    const service = createService({
      inspectUrl: async () => {
        probes += 1
        return WEBM_PROBE
      },
    })
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))
    const first = await service.complete(session.id, completion)

    expect(await service.complete(session.id, completion)).toEqual(first)
    expect(probes).toBe(1)
  })

  it('Given a real webm, should detect its dimensions through the real probe', async () => {
    const service = createService({ inspectUrl: inspectVideoUrl })
    const { session, completion } = await uploadWhole(service, await createWebm())

    expect(await service.complete(session.id, completion)).toMatchObject({
      width: 64,
      height: 96,
      contentType: 'video/webm',
    })
  })

  it('Given parts that do not cover the declared size, should reject and keep the row', async () => {
    const service = createService()
    const session = await service.start({
      contentType: 'video/webm',
      size: Models.VIDEO_UPLOAD_PART_BYTES + 1,
    })

    await expect(
      service.complete(session.id, { parts: [{ partNumber: 1, etag: '"abc"' }] }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(await db.$count(videoUpload)).toBe(1)
  })

  it('Given a stored size different from the declared one, should delete the row and the object', async () => {
    const service = createService()
    const session = await service.start({ contentType: 'video/webm', size: 5 })
    const etag = await putPart(session.parts[0]?.url ?? '', new Uint8Array([1, 2, 3]))

    await expect(
      service.complete(session.id, { parts: [{ partNumber: 1, etag }] }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(await db.$count(videoUpload)).toBe(0)
    expect(fake.listObjects()).toEqual([])
  })

  it('Given a detected type different from the declared one, should delete the row and the object', async () => {
    const service = createService({
      inspectUrl: async () => ({ ...WEBM_PROBE, contentType: 'video/mp4' }),
    })
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))

    await expect(service.complete(session.id, completion)).rejects.toBeInstanceOf(ValidationError)
    expect(await db.$count(videoUpload)).toBe(0)
    expect(fake.listObjects()).toEqual([])
  })
})

describe('VideoUploadService.abort', () => {
  it('Given a pending upload, should abort the multipart upload and delete the row', async () => {
    const service = createService()
    const session = await service.start({ contentType: 'video/webm', size: 3 })

    await service.abort(session.id)

    expect(fake.listUploads()).toEqual([])
    expect(await db.$count(videoUpload)).toBe(0)
  })

  it('Given a pending upload whose multipart upload already completed, should leave no objects', async () => {
    const service = createService({
      inspectUrl: async () => {
        throw new Error('probe unavailable')
      },
    })
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))
    await expect(service.complete(session.id, completion)).rejects.toThrow('probe unavailable')
    const [pending] = await db.select().from(videoUpload)
    expect(pending?.status).toBe('pending')
    expect(fake.listObjects()).toHaveLength(1)

    await service.abort(session.id)

    expect(fake.listObjects()).toEqual([])
    expect(fake.listUploads()).toEqual([])
    expect(await db.$count(videoUpload)).toBe(0)
  })

  it('Given a ready upload, should delete the row and remove the object', async () => {
    const service = createService()
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))
    await service.complete(session.id, completion)

    await service.abort(session.id)

    expect(await db.$count(videoUpload)).toBe(0)
    expect(fake.listObjects()).toEqual([])
  })
})

describe('VideoUploadService.claim', () => {
  it('Given a ready upload, should return the stored video once', async () => {
    const service = createService()
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))
    await service.complete(session.id, completion)

    const claimed = await db.transaction((tx) => service.claim(tx, session.id))

    expect(claimed).toMatchObject({ contentType: 'video/webm', width: 64, height: 96, size: 3 })
    expect(claimed.key).toMatch(/^videos\/.+\.webm$/)
    await expect(db.transaction((tx) => service.claim(tx, session.id))).rejects.toThrow(
      'Video upload is not ready',
    )
  })

  it('Given a pending upload, should throw and keep the row', async () => {
    const service = createService()
    const session = await service.start({ contentType: 'video/webm', size: 3 })

    await expect(db.transaction((tx) => service.claim(tx, session.id))).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(await db.$count(videoUpload)).toBe(1)
  })

  it('Given a ready upload older than the TTL, should throw', async () => {
    const service = createService()
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))
    await service.complete(session.id, completion)
    clock = new Date(clock.getTime() + 7 * HOUR_MS)

    await expect(db.transaction((tx) => service.claim(tx, session.id))).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('Given a rolled back transaction, should keep the row for a retry', async () => {
    const service = createService()
    const { session, completion } = await uploadWhole(service, new Uint8Array([1, 2, 3]))
    await service.complete(session.id, completion)

    await expect(
      db.transaction(async (tx) => {
        await service.claim(tx, session.id)
        throw new ValidationError('Post rejected')
      }),
    ).rejects.toThrow('Post rejected')

    expect(await db.$count(videoUpload)).toBe(1)
  })
})

describe('VideoUploadService.sweepExpired', () => {
  it('Given expired pending and ready uploads, should abort and remove them and keep fresh ones', async () => {
    const service = createService()
    const ready = await uploadWhole(service, new Uint8Array([1, 2, 3]))
    await service.complete(ready.session.id, ready.completion)
    await service.start({ contentType: 'video/webm', size: 3 })
    clock = new Date(clock.getTime() + 7 * HOUR_MS)
    const fresh = await service.start({ contentType: 'video/webm', size: 3 })

    expect(fake.listUploads()).toHaveLength(1)
    expect(fake.listObjects()).toEqual([])
    const rows = await db.select().from(videoUpload)
    expect(rows.map((row) => row.id)).toEqual([fresh.id])
  })

  it('Given nothing expired, should remove nothing', async () => {
    const service = createService()
    await service.start({ contentType: 'video/webm', size: 3 })

    expect(await service.sweepExpired()).toEqual({ removed: 0 })
    expect(await db.$count(videoUpload)).toBe(1)
  })
})
