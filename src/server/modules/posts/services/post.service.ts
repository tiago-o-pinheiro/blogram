import { randomBytes } from 'node:crypto'

import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { Models } from '@/models'

import { GlobalError } from '@/server/errors/global-error'
import {
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '@/server/errors/http-errors'
import { decode } from '@/server/lib/codec'
import { db, type DbTransaction } from '@/server/lib/db'
import { toPagination, toPaginationMeta } from '@/server/lib/pagination'
import { storage, type StorageDriver, type StorageObject } from '@/server/lib/storage'
import { media } from '@/server/modules/media/schemas/media.table'
import { mediaService, type MediaService } from '@/server/modules/media/services/media.service'
import { post } from '@/server/modules/posts/schemas/post.table'

import { normalizeWebUrl, normalizeYoutubeUrl } from './post-url'
import { toPost } from './to-post'

const PUBLIC_ID_LENGTH = 10
const PUBLIC_ID_BYTES = 8
const PUBLIC_ID_ATTEMPTS = 5
const IMAGE_ROLE = 'image'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type PostRow = typeof post.$inferSelect
type MediaRow = typeof media.$inferSelect
type PostRecord = { post: PostRow; media: MediaRow | null; video: MediaRow | null }
type MediaVariantKey = 'full' | Models.ImageVariantName

type PostServiceDependencies = {
  storage: StorageDriver
  media?: Pick<MediaService, 'processPostImage' | 'deleteObjects'> &
    Partial<Pick<MediaService, 'processPostVideo'>>
}

export type PostDraftInput = {
  type: Models.PostType
  text: string
  altText: string
  file?: File
  poster?: File
  url?: string
  title?: string
  description?: string
  source?: string
}

const videoMedia = alias(media, 'video_media')

const createPublicId = (): string =>
  randomBytes(PUBLIC_ID_BYTES).toString('base64url').slice(0, PUBLIC_ID_LENGTH)

const toStoredKeys = (row: MediaRow): string[] => [row.key, ...row.variants.map((v) => v.key)]

const toLink = (input: Pick<PostDraftInput, 'url' | 'title' | 'description' | 'source'>) => {
  const url = normalizeWebUrl(input.url ?? '')
  return decode(Models.PostLink, {
    url: url.href,
    title: input.title?.trim(),
    description: input.description ?? '',
    source: input.source?.trim() || url.hostname,
  })
}

const toByteRange = (header: string | null | undefined, size: number) => {
  if (!header) {
    return undefined
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  const startValue = match?.[1]
  const endValue = match?.[2]
  if (!match || (!startValue && !endValue)) {
    throw new GlobalError('Invalid byte range', 416, { size })
  }
  const start = startValue ? Number(startValue) : Math.max(0, size - Number(endValue))
  const end = startValue && endValue ? Math.min(Number(endValue), size - 1) : size - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
    throw new GlobalError('Invalid byte range', 416, { size })
  }
  return { start, end }
}

export class PostService {
  private readonly storage: StorageDriver
  private readonly media: Pick<MediaService, 'processPostImage' | 'deleteObjects'> &
    Partial<Pick<MediaService, 'processPostVideo'>>

  constructor(dependencies: PostServiceDependencies) {
    this.storage = dependencies.storage
    this.media = dependencies.media ?? mediaService
  }

  createPhotoDraft = async (input: {
    text: string
    altText: string
    file: File
  }): Promise<Models.Post> => this.createDraft({ ...input, type: 'photo' })

  createDraft = async (input: PostDraftInput): Promise<Models.Post> => {
    const details =
      input.type === 'youtube'
        ? normalizeYoutubeUrl(input.url ?? '')
        : input.type === 'link' || input.type === 'news'
          ? toLink(input)
          : {}
    if ((input.type === 'photo' || input.type === 'video') && !input.file) {
      throw new ValidationError('A media file is required')
    }
    if (input.type === 'video' && !input.poster) {
      throw new ValidationError('A video poster image is required')
    }
    const written: string[] = []
    try {
      const imageFile =
        input.type === 'video' ? input.poster : input.type === 'youtube' ? undefined : input.file
      const processed = imageFile ? await this.media.processPostImage(imageFile) : undefined
      if (processed) {
        written.push(processed.key, ...processed.variants.map((variant) => variant.key))
      }
      const video =
        input.type === 'video' && input.file
          ? await (this.media.processPostVideo ?? mediaService.processPostVideo)(input.file)
          : undefined
      if (video) {
        written.push(video.key)
      }
      const record = await db.transaction(async (tx) => {
        const draft = await this.insertPost(tx, input.text, input.type, details)
        const [image] = processed
          ? await tx
              .insert(media)
              .values({
                postId: draft.id,
                role: IMAGE_ROLE,
                key: processed.key,
                contentType: processed.contentType,
                width: processed.width,
                height: processed.height,
                sizeBytes: processed.size,
                altText: input.altText,
                variants: processed.variants,
              })
              .returning()
          : []
        const [videoRow] = video
          ? await tx
              .insert(media)
              .values({
                postId: draft.id,
                role: 'video',
                key: video.key,
                contentType: video.contentType,
                width: video.width,
                height: video.height,
                sizeBytes: video.size,
              })
              .returning()
          : []
        return { post: draft, media: image ?? null, video: videoRow ?? null }
      })
      return toPost(record)
    } catch (error) {
      await this.media.deleteObjects(written)
      throw error
    }
  }

  listPosts = async (query: Models.PostListQuery): Promise<Models.PostPage> => {
    const where = query.status ? eq(post.status, query.status) : undefined
    const { take, skip } = toPagination(query)
    const rows = await this.selectRecords(where)
      .orderBy(desc(sql`coalesce(${post.publishedAt}, ${post.createdAt})`), asc(post.id))
      .limit(take)
      .offset(skip)
    const total = await db.$count(post, where)
    return { data: rows.map(toPost), meta: toPaginationMeta(total, query) }
  }

  getPost = async (id: string): Promise<Models.Post> => toPost(await this.requireRecord(id))

  updatePost = async (id: string, update: Models.PostUpdate): Promise<Models.Post> => {
    const record = await this.requireRecord(id)
    const dto = toPost(record)
    const details =
      record.post.type === 'youtube'
        ? normalizeYoutubeUrl(update.url ?? dto.youtube?.url ?? '')
        : record.post.type === 'link' || record.post.type === 'news'
          ? toLink({ ...dto.link, ...update })
          : record.post.details
    await db.transaction(async (tx) => {
      await tx
        .update(post)
        .set({ text: update.text ?? record.post.text, details, updatedAt: new Date() })
        .where(eq(post.id, record.post.id))
      if (update.altText !== undefined) {
        await tx
          .update(media)
          .set({ altText: update.altText })
          .where(and(eq(media.postId, record.post.id), eq(media.role, IMAGE_ROLE)))
      }
    })
    return this.getPost(id)
  }

  replaceImage = async (id: string, file: File): Promise<Models.Post> => {
    const record = await this.requireRecord(id)
    const processed = await this.media.processPostImage(file)
    let replacedKeys: string[]
    try {
      replacedKeys = await db.transaction(async (tx) => {
        const [previous] = await tx
          .select()
          .from(media)
          .where(and(eq(media.postId, record.post.id), eq(media.role, IMAGE_ROLE)))
          .for('update')
        if (previous) {
          await tx.delete(media).where(eq(media.id, previous.id))
        }
        await tx.insert(media).values({
          postId: record.post.id,
          role: IMAGE_ROLE,
          key: processed.key,
          contentType: processed.contentType,
          width: processed.width,
          height: processed.height,
          sizeBytes: processed.size,
          altText: previous?.altText ?? '',
          variants: processed.variants,
        })
        await tx.update(post).set({ updatedAt: new Date() }).where(eq(post.id, record.post.id))
        return previous ? toStoredKeys(previous) : []
      })
    } catch (error) {
      await this.media.deleteObjects([processed.key, ...processed.variants.map((v) => v.key)])
      throw error
    }
    await this.media.deleteObjects(replacedKeys)
    return this.getPost(id)
  }

  replaceVideo = async (id: string, file: File): Promise<Models.Post> => {
    const record = await this.requireRecord(id)
    if (record.post.type !== 'video') {
      throw new ValidationError('Only uploaded video posts accept video replacement')
    }
    const processed = await (this.media.processPostVideo ?? mediaService.processPostVideo)(file)
    let replacedKeys: string[]
    try {
      replacedKeys = await db.transaction(async (tx) => {
        const [previous] = await tx
          .select()
          .from(media)
          .where(and(eq(media.postId, record.post.id), eq(media.role, 'video')))
          .for('update')
        if (previous) {
          await tx.delete(media).where(eq(media.id, previous.id))
        }
        await tx.insert(media).values({
          postId: record.post.id,
          role: 'video',
          key: processed.key,
          contentType: processed.contentType,
          width: processed.width,
          height: processed.height,
          sizeBytes: processed.size,
        })
        await tx.update(post).set({ updatedAt: new Date() }).where(eq(post.id, record.post.id))
        return previous ? toStoredKeys(previous) : []
      })
    } catch (error) {
      await this.media.deleteObjects([processed.key])
      throw error
    }
    await this.media.deleteObjects(replacedKeys)
    return this.getPost(id)
  }

  setStatus = async (id: string, status: Models.PostStatus): Promise<Models.Post> => {
    const record = await this.requireRecord(id)
    if (status === 'published') {
      const dto = toPost(record)
      if ((dto.type === 'photo' || dto.type === 'video') && !record.media) {
        throw new ValidationError('A post needs an image before it can be published')
      }
      if (dto.type === 'video' && !dto.video) {
        throw new ValidationError('A video file is required before publishing')
      }
      if (dto.type === 'youtube' && !dto.youtube) {
        throw new ValidationError('A valid YouTube URL is required before publishing')
      }
      if ((dto.type === 'link' || dto.type === 'news') && !dto.link) {
        throw new ValidationError('A link URL and title are required before publishing')
      }
    }
    await db
      .update(post)
      .set({
        status,
        publishedAt:
          status === 'published'
            ? (record.post.publishedAt ?? new Date())
            : record.post.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(post.id, record.post.id))
    return this.getPost(id)
  }

  deletePost = async (id: string): Promise<void> => {
    const record = await this.requireRecord(id)
    await db.delete(post).where(eq(post.id, record.post.id))
    if (record.media) {
      await this.media.deleteObjects(toStoredKeys(record.media))
    }
    if (record.video) {
      await this.media.deleteObjects(toStoredKeys(record.video))
    }
  }

  readMedia = async (
    mediaId: string,
    access: {
      isOwner: boolean
      variant?: MediaVariantKey
      range?: string | null
      isHead?: boolean
    },
  ): Promise<{ object: StorageObject; isPublic: boolean }> => {
    if (!UUID_PATTERN.test(mediaId)) {
      throw new NotFoundError('Media not found')
    }
    const [row] = await db
      .select({ media, status: post.status })
      .from(media)
      .innerJoin(post, eq(post.id, media.postId))
      .where(eq(media.id, mediaId))
    const isPublic = row?.status === 'published'
    if (!row || (!isPublic && !access.isOwner)) {
      throw new NotFoundError('Media not found')
    }
    const target = this.resolveTarget(row.media, access.variant ?? 'full')
    const range = toByteRange(access.range, row.media.sizeBytes)
    if (access.isHead) {
      return {
        object: {
          body: new Uint8Array(),
          contentType: target.contentType,
          size: row.media.sizeBytes,
          range,
        },
        isPublic,
      }
    }
    const object = await this.storage.get(target.key, { range })
    if (!object) {
      throw new NotFoundError('Media not found')
    }
    return { object: { ...object, contentType: target.contentType }, isPublic }
  }

  private resolveTarget = (
    row: MediaRow,
    variant: MediaVariantKey,
  ): { key: string; contentType: string } => {
    if (variant === 'full') {
      return { key: row.key, contentType: row.contentType }
    }
    const found = row.variants.find((candidate) => candidate.name === variant)
    if (!found) {
      throw new NotFoundError('Media not found')
    }
    return { key: found.key, contentType: found.contentType }
  }

  private selectRecords = (where?: SQL) =>
    db
      .select({ post, media, video: videoMedia })
      .from(post)
      .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, IMAGE_ROLE)))
      .leftJoin(videoMedia, and(eq(videoMedia.postId, post.id), eq(videoMedia.role, 'video')))
      .where(where)

  private requireRecord = async (id: string): Promise<PostRecord> => {
    const [record] = await this.selectRecords(eq(post.publicId, id))
    if (!record) {
      throw new NotFoundError('Post not found')
    }
    return record
  }

  private insertPost = async (
    tx: DbTransaction,
    text: string,
    type: Models.PostType,
    details: unknown,
  ): Promise<PostRow> => {
    for (let attempt = 0; attempt < PUBLIC_ID_ATTEMPTS; attempt += 1) {
      const [draft] = await tx
        .insert(post)
        .values({ publicId: createPublicId(), type, text, details })
        .onConflictDoNothing({ target: post.publicId })
        .returning()
      if (draft) {
        return draft
      }
    }
    throw new ServiceUnavailableError('Could not allocate a public post id')
  }
}

export const postService = new PostService({ storage })
