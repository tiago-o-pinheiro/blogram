// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ServiceUnavailableError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { createLocalDriver } from '@/server/lib/storage/local-driver'
import { mediaCleanup } from '@/server/modules/media/schemas/media-cleanup.table'
import { MediaCleanupService } from '@/server/modules/media/services/media-cleanup.service'
import { MediaService } from '@/server/modules/media/services/media.service'
import { createPng } from '@/test/image-fixtures'

import { PostService } from './post.service'

describe('Post service audit regressions', () => {
  let directory: string
  let driver: ReturnType<typeof createLocalDriver>
  let service: PostService

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-audit-'))
    driver = createLocalDriver(directory)
    service = new PostService({
      storage: driver,
      media: new MediaService({ storage: driver, getMaxBytes: () => 1000000 }),
    })
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  const createPhoto = async () =>
    service.createPhotoDraft({
      text: 'Original text',
      altText: 'Original alternative',
      file: new File([new Uint8Array(await createPng())], 'photo.png', { type: 'image/png' }),
    })

  it('BH-6: Given concurrent text and alternative edits, should preserve both independent changes', async () => {
    const draft = await createPhoto()
    const originalQuery = db.$client.query
    const queryDatabase = db.$client.query.bind(db.$client)
    let releaseReads: () => void = () => undefined
    const bothReads = new Promise<void>((resolve) => {
      releaseReads = resolve
    })
    let reads = 0
    Object.defineProperty(db.$client, 'query', {
      configurable: true,
      writable: true,
      value: async (query: unknown, values: unknown) => {
        if (
          typeof query !== 'object' ||
          query === null ||
          !('text' in query) ||
          typeof query.text !== 'string'
        ) {
          throw new ValidationError('Expected a parameterized query')
        }
        const response = await queryDatabase(
          { ...query, text: query.text },
          Array.isArray(values) ? values : [],
        )
        if (query.text.includes('from "post"') && reads < 2) {
          reads += 1
          if (reads === 2) {
            releaseReads()
          }
          await bothReads
        }
        return response
      },
    })

    try {
      await Promise.all([
        service.updatePost(draft.id, { text: 'Edited text' }),
        service.updatePost(draft.id, { altText: 'Edited alternative' }),
      ])
    } finally {
      Object.defineProperty(db.$client, 'query', {
        configurable: true,
        writable: true,
        value: originalQuery,
      })
    }

    expect(await service.getPost(draft.id)).toMatchObject({
      text: 'Edited text',
      image: { altText: 'Edited alternative' },
    })
  })

  it('BH-7: Given unavailable storage during deletion, should persist failed cleanup for retry', async () => {
    const draft = await createPhoto()
    const unavailable = {
      ...driver,
      delete: async () => {
        throw new ServiceUnavailableError('Storage unavailable')
      },
    }
    const failing = new PostService({
      storage: unavailable,
      media: new MediaService({ storage: unavailable, getMaxBytes: () => 1000000 }),
    })

    await failing.deletePost(draft.id)
    const [queued] = await db.select().from(mediaCleanup)

    expect(queued?.attempts).toBe(1)
    expect(await driver.get(queued?.key ?? '')).not.toBeNull()
    expect(await new MediaCleanupService(driver).drain()).toEqual({ deleted: 1, pending: 0 })
    expect(await driver.get(queued?.key ?? '')).toBeNull()
  })

  it('Given unavailable storage after replacement, should retain cleanup without deleting the current image', async () => {
    const draft = await createPhoto()
    const unavailable = {
      ...driver,
      delete: async () => {
        throw new ServiceUnavailableError('Storage unavailable')
      },
    }
    const replacing = new PostService({
      storage: unavailable,
      media: new MediaService({ storage: unavailable, getMaxBytes: () => 1000000 }),
    })

    const edited = await replacing.replaceImage(
      draft.id,
      new File([new Uint8Array(await createPng())], 'replacement.png', { type: 'image/png' }),
    )
    const [queued] = await db.select().from(mediaCleanup)

    expect(edited.image?.id).not.toBe(draft.image?.id)
    expect(queued?.attempts).toBe(1)
    expect(await driver.get(queued?.key ?? '')).not.toBeNull()
    expect(await new MediaCleanupService(driver).drain()).toEqual({ deleted: 1, pending: 0 })
    expect(
      (await replacing.readMedia(edited.image?.id ?? '', { isOwner: true })).object.body.byteLength,
    ).toBeGreaterThan(0)
  })
})
