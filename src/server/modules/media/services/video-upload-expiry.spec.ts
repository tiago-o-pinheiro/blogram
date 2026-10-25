// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { NotFoundError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { createS3Driver } from '@/server/lib/storage/s3-driver'
import { videoUpload } from '@/server/modules/media/schemas/video-upload.table'
import { createFakeS3, type FakeS3 } from '@/test/fake-s3'

import { MediaCleanupService } from './media-cleanup.service'
import { type VideoProbeResult } from './video'
import { VideoUploadService } from './video-upload.service'

const HOUR_MS = 3600 * 1000
const WEBM_PROBE: VideoProbeResult = { width: 64, height: 96, contentType: 'video/webm' }

let fake: FakeS3
let clock: Date

const createService = () => {
  const driver = createS3Driver(fake.config)
  return new VideoUploadService({
    getUploads: () => driver,
    getMaxVideoBytes: () => 1_000_000_000,
    inspectUrl: async () => WEBM_PROBE,
    cleanup: new MediaCleanupService(driver),
    now: () => clock,
  })
}

beforeEach(async () => {
  fake = await createFakeS3()
  clock = new Date('2026-01-01T00:00:00.000Z')
})

afterEach(async () => {
  await fake.close()
})

describe('VideoUploadService.complete expiry', () => {
  it('BH-1: Given an upload older than the TTL, should reject complete as not found and never mark it ready', async () => {
    const service = createService()
    const body = new Uint8Array([1, 2, 3])
    const session = await service.start({ contentType: 'video/webm', size: body.byteLength })
    const [part] = session.parts
    const response = await fetch(part?.url ?? '', { method: 'PUT', body })
    const etag = response.headers.get('etag') ?? ''
    clock = new Date(clock.getTime() + 7 * HOUR_MS)

    await expect(
      service.complete(session.id, { parts: [{ partNumber: 1, etag }] }),
    ).rejects.toBeInstanceOf(NotFoundError)

    const rows = await db.select().from(videoUpload)
    expect(rows.filter((row) => row.status === 'ready')).toEqual([])
  })
})
