import { asc, eq, sql } from 'drizzle-orm'

import { db, type DbTransaction } from '@/server/lib/db'
import { storage, type StorageDriver } from '@/server/lib/storage'
import { mediaCleanup } from '@/server/modules/media/schemas/media-cleanup.table'

const CLEANUP_BATCH_SIZE = 25

export class MediaCleanupService {
  constructor(private readonly storage: StorageDriver) {}

  enqueue = async (tx: DbTransaction, keys: string[]): Promise<void> => {
    if (keys.length === 0) {
      return
    }
    await tx
      .insert(mediaCleanup)
      .values([...new Set(keys)].map((key) => ({ key })))
      .onConflictDoNothing()
  }

  schedule = async (keys: string[]): Promise<{ deleted: number; pending: number }> => {
    await db.transaction((tx) => this.enqueue(tx, keys))
    return this.drain()
  }

  drain = async (): Promise<{ deleted: number; pending: number }> => {
    const queued = await db
      .select({ key: mediaCleanup.key })
      .from(mediaCleanup)
      .orderBy(asc(mediaCleanup.attempts), asc(mediaCleanup.createdAt), asc(mediaCleanup.key))
      .limit(CLEANUP_BATCH_SIZE)
    let deleted = 0
    for (const entry of queued) {
      await db
        .update(mediaCleanup)
        .set({ attempts: sql`${mediaCleanup.attempts} + 1`, lastAttemptAt: new Date() })
        .where(eq(mediaCleanup.key, entry.key))
      try {
        await this.storage.delete(entry.key)
      } catch {
        continue
      }
      await db.delete(mediaCleanup).where(eq(mediaCleanup.key, entry.key))
      deleted += 1
    }
    return { deleted, pending: await db.$count(mediaCleanup) }
  }
}

export const mediaCleanupService = new MediaCleanupService(storage)
