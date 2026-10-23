// @vitest-environment node
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { NotFoundError, PayloadTooLargeError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { createLocalDriver } from '@/server/lib/storage/local-driver'
import { media } from '@/server/modules/media/schemas/media.table'
import { MediaService } from '@/server/modules/media/services/media.service'
import { post } from '@/server/modules/posts/schemas/post.table'
import { PostService } from '@/server/modules/posts/services/post.service'
import { createPng, createTextAsJpg, createWideJpegWithGps } from '@/test/image-fixtures'

const MAX_BYTES = 5_000_000
const WIDE = { width: 2000, height: 1000 }

describe('PostService', () => {
  let directory: string
  let driver: ReturnType<typeof createLocalDriver>
  let service: PostService

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blogram-posts-'))
    driver = createLocalDriver(directory)
    service = new PostService({
      storage: driver,
      media: new MediaService({ storage: driver, getMaxBytes: () => MAX_BYTES }),
    })
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  const countObjects = async () =>
    (await readdir(directory, { recursive: true, withFileTypes: true })).filter((entry) =>
      entry.isFile(),
    ).length

  const toWideFile = async () =>
    new File([new Uint8Array(await createWideJpegWithGps(WIDE.width, WIDE.height))], 'a.jpg', {
      type: 'image/jpeg',
    })

  const createDraft = async (text = 'hello', altText = 'a blue field') =>
    service.createPhotoDraft({ text, altText, file: await toWideFile() })

  it('Given a valid upload, should create a draft with ratio, alt text and variants', async () => {
    const created = await createDraft()

    expect(created).toMatchObject({
      type: 'photo',
      status: 'draft',
      text: 'hello',
      likes: 0,
      publishedAt: null,
    })
    expect(created.id).toMatch(/^[A-Za-z0-9_-]{10}$/)
    expect(created.image).toMatchObject({ width: 2000, height: 1000, altText: 'a blue field' })
    expect(created.image?.variants.map((variant) => variant.name)).toEqual([
      'w480',
      'w960',
      'w1600',
    ])
    expect(await countObjects()).toBe(4)
  })

  it('Given a small upload, should not create variants larger than the source', async () => {
    const file = new File([new Uint8Array(await createPng())], 'a.png', { type: 'image/png' })

    const created = await service.createPhotoDraft({ text: '', altText: '', file })

    expect(created.image?.variants).toEqual([])
  })

  it('Given a stored object, should hold no EXIF or GPS metadata', async () => {
    const created = await createDraft()

    const { object } = await service.readMedia(created.image?.id ?? '', { isOwner: true })

    const metadata = await sharp(Buffer.from(object.body)).metadata()
    expect(metadata.exif).toBeUndefined()
  })

  it('Given a fake image, should reject and leave no object and no row', async () => {
    const file = new File([new Uint8Array(createTextAsJpg())], 'a.jpg', { type: 'image/jpeg' })

    await expect(service.createPhotoDraft({ text: '', altText: '', file })).rejects.toBeInstanceOf(
      ValidationError,
    )

    expect(await countObjects()).toBe(0)
    expect(await db.select().from(post)).toEqual([])
  })

  it('Given an oversize file, should reject with payload too large and store nothing', async () => {
    const file = new File([new Uint8Array(MAX_BYTES + 1)], 'a.jpg', { type: 'image/jpeg' })

    await expect(service.createPhotoDraft({ text: '', altText: '', file })).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    )

    expect(await countObjects()).toBe(0)
  })

  it('Given a database failure after processing, should delete the written objects and keep no row', async () => {
    const real = new MediaService({ storage: driver, getMaxBytes: () => MAX_BYTES })
    const failing = new PostService({
      storage: driver,
      media: {
        processPostImage: async (file) => ({
          ...(await real.processPostImage(file)),
          size: 2 ** 40,
        }),
        deleteObjects: real.deleteObjects,
      },
    })

    await expect(
      failing.createPhotoDraft({ text: '', altText: '', file: await toWideFile() }),
    ).rejects.toThrow()

    expect(await countObjects()).toBe(0)
    expect(await db.select().from(post)).toEqual([])
  })

  it('Given an edit, should persist text and alt text', async () => {
    const created = await createDraft()

    const updated = await service.updatePost(created.id, { text: 'new', altText: 'new alt' })

    expect(updated.text).toBe('new')
    expect(updated.image?.altText).toBe('new alt')
    expect((await service.getPost(created.id)).image?.altText).toBe('new alt')
  })

  it('Given only alt text in an edit, should keep the text', async () => {
    const created = await createDraft('keep me')

    const updated = await service.updatePost(created.id, { altText: 'only alt' })

    expect(updated.text).toBe('keep me')
  })

  it('Given an image replacement, should delete the previous objects and keep alt text', async () => {
    const created = await createDraft()
    const file = new File([new Uint8Array(await createPng())], 'a.png', { type: 'image/png' })

    const replaced = await service.replaceImage(created.id, file)

    expect(replaced.image?.id).not.toBe(created.image?.id)
    expect(replaced.image).toMatchObject({ width: 64, height: 64, altText: 'a blue field' })
    expect(await countObjects()).toBe(1)
  })

  it('Given an invalid replacement, should keep the previous objects', async () => {
    const created = await createDraft()
    const file = new File([new Uint8Array(createTextAsJpg())], 'a.jpg', { type: 'image/jpeg' })

    await expect(service.replaceImage(created.id, file)).rejects.toBeInstanceOf(ValidationError)

    expect(await countObjects()).toBe(4)
    expect((await service.getPost(created.id)).image?.width).toBe(2000)
  })

  it('Given a draft, should publish with a date that survives unpublish and republish', async () => {
    const created = await createDraft()

    const published = await service.setStatus(created.id, 'published')
    const unpublished = await service.setStatus(created.id, 'draft')
    const republished = await service.setStatus(created.id, 'published')

    expect(published.status).toBe('published')
    expect(published.publishedAt).not.toBeNull()
    expect(unpublished.status).toBe('draft')
    expect(unpublished.publishedAt).toBe(published.publishedAt)
    expect(republished.publishedAt).toBe(published.publishedAt)
  })

  it('Given a repeated status change, should be idempotent', async () => {
    const created = await createDraft()

    const first = await service.setStatus(created.id, 'published')
    const second = await service.setStatus(created.id, 'published')

    expect(second.publishedAt).toBe(first.publishedAt)
    expect((await service.setStatus(created.id, 'draft')).status).toBe('draft')
    expect((await service.setStatus(created.id, 'draft')).status).toBe('draft')
  })

  it('Given a post without an image, should refuse to publish it', async () => {
    const created = await createDraft()
    await db.delete(media)

    await expect(service.setStatus(created.id, 'published')).rejects.toBeInstanceOf(ValidationError)
  })

  it('Given a delete, should remove the row, media rows and every stored object', async () => {
    const created = await createDraft()

    await service.deletePost(created.id)

    expect(await db.select().from(post)).toEqual([])
    expect(await db.select().from(media)).toEqual([])
    expect(await countObjects()).toBe(0)
    await expect(service.getPost(created.id)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('Given an unknown id, should throw not found on every operation', async () => {
    await expect(service.getPost('AAAAAAAAAA')).rejects.toBeInstanceOf(NotFoundError)
    await expect(service.updatePost('AAAAAAAAAA', { text: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(service.setStatus('AAAAAAAAAA', 'published')).rejects.toBeInstanceOf(NotFoundError)
    await expect(service.deletePost('AAAAAAAAAA')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('Given posts, should list newest first, filter by status and paginate', async () => {
    const first = await createDraft('first')
    const second = await createDraft('second')
    const third = await createDraft('third')
    await service.setStatus(first.id, 'published')

    const all = await service.listPosts({ page: 1, pageSize: 20 })
    const published = await service.listPosts({ page: 1, pageSize: 20, status: 'published' })
    const secondPage = await service.listPosts({ page: 2, pageSize: 2 })

    expect(all.data[0]?.id).toBe(first.id)
    expect(all.data.map((item) => item.id).sort()).toEqual([first.id, second.id, third.id].sort())
    expect(all.meta).toEqual({ total: 3, page: 1, pageSize: 20 })
    expect(published.data.map((item) => item.id)).toEqual([first.id])
    expect(published.meta.total).toBe(1)
    expect(secondPage.data).toHaveLength(1)
    expect(secondPage.meta.total).toBe(3)
  })

  it('Given a draft, should hide its media from non-owners and show it to the owner', async () => {
    const created = await createDraft()
    const mediaId = created.image?.id ?? ''

    await expect(service.readMedia(mediaId, { isOwner: false })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    const owned = await service.readMedia(mediaId, { isOwner: true })

    expect(owned.isPublic).toBe(false)
    expect(owned.object.contentType).toBe('image/webp')
  })

  it('Given a published post, should serve media and variants publicly and hide it again on unpublish', async () => {
    const created = await createDraft()
    const mediaId = created.image?.id ?? ''
    await service.setStatus(created.id, 'published')

    const full = await service.readMedia(mediaId, { isOwner: false })
    const small = await service.readMedia(mediaId, { isOwner: false, variant: 'w480' })
    await service.setStatus(created.id, 'draft')

    expect(full.isPublic).toBe(true)
    expect((await sharp(Buffer.from(full.object.body)).metadata()).width).toBe(2000)
    expect((await sharp(Buffer.from(small.object.body)).metadata()).width).toBe(480)
    await expect(service.readMedia(mediaId, { isOwner: false })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('Given a missing variant or malformed id, should throw not found', async () => {
    const small = await service.createPhotoDraft({
      text: '',
      altText: '',
      file: new File([new Uint8Array(await createPng())], 'a.png', { type: 'image/png' }),
    })

    await expect(
      service.readMedia(small.image?.id ?? '', { isOwner: true, variant: 'w480' }),
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(service.readMedia('not-a-uuid', { isOwner: true })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
