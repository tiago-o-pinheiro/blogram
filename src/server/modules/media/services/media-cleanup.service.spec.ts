// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ServiceUnavailableError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { createStorageKey } from '@/server/lib/storage'
import { createLocalDriver } from '@/server/lib/storage/local-driver'
import { mediaCleanup } from '@/server/modules/media/schemas/media-cleanup.table'

import { MediaCleanupService } from './media-cleanup.service'

describe('MediaCleanupService', () => {
  let directory: string
  let driver: ReturnType<typeof createLocalDriver>
  let cleanup: MediaCleanupService

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-cleanup-'))
    driver = createLocalDriver(directory)
    cleanup = new MediaCleanupService(driver)
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('Given a stored unused file, should remove it and its queued reference', async () => {
    const key = createStorageKey('posts', 'webp')
    await driver.put(key, new Uint8Array([1]), 'image/webp')

    expect(await cleanup.schedule([key, key])).toEqual({ deleted: 1, pending: 0 })
    expect(await driver.get(key)).toBeNull()
  })

  it('Given a rolled back mutation, should retain neither deletion nor queue entry', async () => {
    const key = createStorageKey('posts', 'webp')
    await driver.put(key, new Uint8Array([1]), 'image/webp')

    await expect(
      db.transaction(async (tx) => {
        await cleanup.enqueue(tx, [key])
        throw new ValidationError('Mutation rejected')
      }),
    ).rejects.toThrow('Mutation rejected')

    expect(await db.select().from(mediaCleanup)).toEqual([])
    expect(await driver.get(key)).not.toBeNull()
  })

  it('Given a failed deletion, should survive service recreation and retry idempotently', async () => {
    const key = createStorageKey('posts', 'webp')
    await driver.put(key, new Uint8Array([1]), 'image/webp')
    const unavailable = new MediaCleanupService({
      ...driver,
      delete: async () => {
        throw new ServiceUnavailableError('Storage unavailable')
      },
    })

    expect(await unavailable.schedule([key])).toEqual({ deleted: 0, pending: 1 })
    expect(await new MediaCleanupService(driver).drain()).toEqual({ deleted: 1, pending: 0 })
    expect(await cleanup.schedule([key])).toEqual({ deleted: 1, pending: 0 })
    expect(await driver.get(key)).toBeNull()
  })

  it('Given more than one cleanup batch, should bound work and retain remaining keys', async () => {
    const keys = Array.from({ length: 26 }, () => createStorageKey('posts', 'webp'))
    await db.transaction((tx) => cleanup.enqueue(tx, keys))

    expect(await cleanup.drain()).toEqual({ deleted: 25, pending: 1 })
    expect(await cleanup.drain()).toEqual({ deleted: 1, pending: 0 })
  })
})
