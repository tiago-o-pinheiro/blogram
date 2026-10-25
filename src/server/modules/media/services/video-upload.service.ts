import { and, eq, gt, lt } from 'drizzle-orm'
import { Value } from 'typebox/value'

import { Models } from '@/models'

import { env } from '@/server/config/env'
import {
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
} from '@/server/errors/http-errors'
import { db, type DbTransaction } from '@/server/lib/db'
import { createStorageKey, directUploads, type DirectUploadDriver } from '@/server/lib/storage'
import { videoUpload } from '@/server/modules/media/schemas/video-upload.table'

import { mediaCleanupService, type MediaCleanupService } from './media-cleanup.service'
import { type ProcessedVideo } from './media.service'
import { inspectVideoUrl, type VideoProbeResult } from './video'

const PROBE_URL_TTL_SECONDS = 300
const STATUS_PENDING = 'pending'
const STATUS_READY = 'ready'

type VideoUploadServiceDependencies = {
  getUploads: () => DirectUploadDriver | null
  getMaxVideoBytes: () => number
  inspectUrl: (url: string) => Promise<VideoProbeResult>
  cleanup: Pick<MediaCleanupService, 'enqueue' | 'drain'>
  now?: () => Date
}

const isVideoType = (value: string): value is Models.VideoUploadType =>
  Value.Check(Models.VideoUploadType, value)

export class VideoUploadService {
  constructor(private readonly dependencies: VideoUploadServiceDependencies) {}

  private now = (): Date => this.dependencies.now?.() ?? new Date()

  private cutoff = (): Date =>
    new Date(this.now().getTime() - Models.VIDEO_UPLOAD_TTL_SECONDS * 1000)

  private requireUploads = (): DirectUploadDriver => {
    const uploads = this.dependencies.getUploads()
    if (!uploads) {
      throw new ConflictError('Direct video uploads are not available')
    }
    return uploads
  }

  start = async (input: Models.VideoUploadStart): Promise<Models.VideoUploadSession> => {
    const uploads = this.requireUploads()
    await this.sweepExpired()
    if (input.size > this.dependencies.getMaxVideoBytes()) {
      throw new PayloadTooLargeError('Video is too large')
    }
    const partCount = Math.ceil(input.size / Models.VIDEO_UPLOAD_PART_BYTES)
    if (partCount > Models.VIDEO_UPLOAD_MAX_PARTS) {
      throw new PayloadTooLargeError('Video is too large')
    }
    const key = createStorageKey('videos', input.contentType === 'video/mp4' ? 'mp4' : 'webm')
    const multipartId = await uploads.createMultipartUpload(key, input.contentType)
    const createdAt = this.now()
    const row = await db
      .insert(videoUpload)
      .values({
        key,
        multipartId,
        contentType: input.contentType,
        sizeBytes: input.size,
        createdAt,
      })
      .returning({ id: videoUpload.id })
      .then(([inserted]) => inserted)
      .catch(async (error: unknown) => {
        await uploads.abortMultipartUpload(key, multipartId).catch(() => undefined)
        throw error
      })
    if (!row) {
      await uploads.abortMultipartUpload(key, multipartId).catch(() => undefined)
      throw new ConflictError('Video upload could not be created')
    }
    const parts = await Promise.all(
      Array.from({ length: partCount }, async (_, index) => ({
        partNumber: index + 1,
        url: await uploads.presignUploadPart(
          key,
          multipartId,
          index + 1,
          Models.VIDEO_UPLOAD_TTL_SECONDS,
        ),
      })),
    )
    return {
      id: row.id,
      partSize: Models.VIDEO_UPLOAD_PART_BYTES,
      parts,
      expiresAt: new Date(
        createdAt.getTime() + Models.VIDEO_UPLOAD_TTL_SECONDS * 1000,
      ).toISOString(),
    }
  }

  complete = async (
    id: string,
    completion: Models.VideoUploadCompletion,
  ): Promise<Models.VideoUploadReady> => {
    const uploads = this.requireUploads()
    const [row] = await db
      .select()
      .from(videoUpload)
      .where(and(eq(videoUpload.id, id), gt(videoUpload.createdAt, this.cutoff())))
    if (!row || !isVideoType(row.contentType)) {
      throw new NotFoundError('Video upload not found')
    }
    if (row.status === STATUS_READY && row.width !== null && row.height !== null) {
      return {
        id: row.id,
        contentType: row.contentType,
        size: row.sizeBytes,
        width: row.width,
        height: row.height,
      }
    }
    const expectedCount = Math.ceil(row.sizeBytes / Models.VIDEO_UPLOAD_PART_BYTES)
    const parts = [...completion.parts].sort((left, right) => left.partNumber - right.partNumber)
    if (
      parts.length !== expectedCount ||
      parts.some((part, index) => part.partNumber !== index + 1)
    ) {
      throw new ValidationError('Video upload parts do not match the declared size')
    }
    await uploads.completeMultipartUpload(row.key, row.multipartId, parts)
    try {
      const metadata = await this.verifyStoredVideo(
        uploads,
        row.key,
        row.sizeBytes,
        row.contentType,
      )
      const [marked] = await db
        .update(videoUpload)
        .set({ status: STATUS_READY, width: metadata.width, height: metadata.height })
        .where(and(eq(videoUpload.id, row.id), eq(videoUpload.status, STATUS_PENDING)))
        .returning({ id: videoUpload.id })
      if (!marked) {
        throw new NotFoundError('Video upload not found')
      }
      return {
        id: row.id,
        contentType: row.contentType,
        size: row.sizeBytes,
        width: metadata.width,
        height: metadata.height,
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof PayloadTooLargeError) {
        await db.transaction(async (tx) => {
          await tx.delete(videoUpload).where(eq(videoUpload.id, row.id))
          await this.dependencies.cleanup.enqueue(tx, [row.key])
        })
        await this.dependencies.cleanup.drain()
      }
      throw error
    }
  }

  private verifyStoredVideo = async (
    uploads: DirectUploadDriver,
    key: string,
    declaredSize: number,
    declaredType: Models.VideoUploadType,
  ): Promise<VideoProbeResult> => {
    const head = await uploads.head(key)
    if (!head || head.size !== declaredSize) {
      throw new ValidationError('Uploaded video size does not match the declared size')
    }
    if (head.size > this.dependencies.getMaxVideoBytes()) {
      throw new PayloadTooLargeError('Video is too large')
    }
    const metadata = await this.dependencies.inspectUrl(
      await uploads.presignGet(key, PROBE_URL_TTL_SECONDS),
    )
    if (metadata.contentType !== declaredType) {
      throw new ValidationError('Uploaded video type does not match the declared type')
    }
    return metadata
  }

  abort = async (id: string): Promise<void> => {
    const uploads = this.requireUploads()
    const row = await db.transaction(async (tx) => {
      const [removed] = await tx.delete(videoUpload).where(eq(videoUpload.id, id)).returning()
      if (removed) {
        await this.dependencies.cleanup.enqueue(tx, [removed.key])
      }
      return removed
    })
    if (!row) {
      throw new NotFoundError('Video upload not found')
    }
    if (row.status === STATUS_PENDING) {
      await uploads.abortMultipartUpload(row.key, row.multipartId)
    }
    await this.dependencies.cleanup.drain()
  }

  claim = async (tx: DbTransaction, id: string): Promise<ProcessedVideo> => {
    const [row] = await tx
      .delete(videoUpload)
      .where(
        and(
          eq(videoUpload.id, id),
          eq(videoUpload.status, STATUS_READY),
          gt(videoUpload.createdAt, this.cutoff()),
        ),
      )
      .returning()
    if (!row || !isVideoType(row.contentType) || row.width === null || row.height === null) {
      throw new ValidationError('Video upload is not ready')
    }
    return {
      key: row.key,
      contentType: row.contentType,
      width: row.width,
      height: row.height,
      size: row.sizeBytes,
    }
  }

  sweepExpired = async (): Promise<{ removed: number }> => {
    const expired = await db.transaction(async (tx) => {
      const rows = await tx
        .delete(videoUpload)
        .where(lt(videoUpload.createdAt, this.cutoff()))
        .returning()
      await this.dependencies.cleanup.enqueue(
        tx,
        rows.map((row) => row.key),
      )
      return rows
    })
    if (expired.length === 0) {
      return { removed: 0 }
    }
    const uploads = this.dependencies.getUploads()
    if (uploads) {
      await Promise.all(
        expired
          .filter((row) => row.status === STATUS_PENDING)
          .map((row) =>
            uploads.abortMultipartUpload(row.key, row.multipartId).catch(() => undefined),
          ),
      )
    }
    await this.dependencies.cleanup.drain()
    return { removed: expired.length }
  }
}

export const videoUploadService = new VideoUploadService({
  getUploads: directUploads,
  getMaxVideoBytes: () => env.UPLOAD_MAX_VIDEO_BYTES,
  inspectUrl: inspectVideoUrl,
  cleanup: mediaCleanupService,
})
