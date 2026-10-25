// @vitest-environment node
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { PUT as PUT_VIDEO } from '@/app/api/admin/posts/[id]/video/route'
import { POST } from '@/app/api/admin/posts/route'
import { decode } from '@/server/lib/codec'
import { db } from '@/server/lib/db'
import { createStorageKey, storage } from '@/server/lib/storage'
import { media } from '@/server/modules/media/schemas/media.table'
import { videoUpload } from '@/server/modules/media/schemas/video-upload.table'
import { createOwnerSession } from '@/test/auth-session'
import { createPng } from '@/test/image-fixtures'

const BASE_URL = 'http://localhost:3000'
const UNKNOWN_UPLOAD_ID = '00000000-0000-4000-8000-000000000000'
const context = (id: string) => ({ params: Promise.resolve({ id }) })

const seedReadyUpload = async (): Promise<{ id: string; key: string }> => {
  const key = createStorageKey('videos', 'webm')
  await storage.put(key, new Uint8Array([1, 2, 3]), 'video/webm')
  const [row] = await db
    .insert(videoUpload)
    .values({
      key,
      multipartId: 'multipart',
      contentType: 'video/webm',
      sizeBytes: 3,
      status: 'ready',
      width: 64,
      height: 96,
    })
    .returning({ id: videoUpload.id })
  return { id: row?.id ?? '', key }
}

const sendCreate = async (cookie: string, fields: Record<string, string | File>) => {
  const form = new FormData()
  form.set('type', 'video')
  form.set('poster', new File([new Uint8Array(await createPng())], 'poster.png'))
  Object.entries(fields).forEach(([name, value]) => form.set(name, value))
  return POST(
    new Request(`${BASE_URL}/api/admin/posts`, { method: 'POST', headers: { cookie }, body: form }),
  )
}

const sendReplace = (cookie: string, postId: string, body: unknown) =>
  PUT_VIDEO(
    new Request(`${BASE_URL}/api/admin/posts/${postId}/video`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(body),
    }),
    context(postId),
  )

describe('direct video post routes', () => {
  it('Given a ready upload, should create a video draft and consume the upload', async () => {
    const cookie = await createOwnerSession()
    const upload = await seedReadyUpload()

    const response = await sendCreate(cookie, { videoUploadId: upload.id })
    const draft = decode(Models.Post, await response.json())
    const [stored] = await db.select().from(media).where(eq(media.role, 'video'))

    expect(response.status).toBe(201)
    expect(draft.video).toMatchObject({ width: 64, height: 96, contentType: 'video/webm' })
    expect(stored?.key).toBe(upload.key)
    expect(await db.select().from(videoUpload)).toEqual([])
  })

  it('Given an upload already claimed, should reject the second claim', async () => {
    const cookie = await createOwnerSession()
    const upload = await seedReadyUpload()
    await sendCreate(cookie, { videoUploadId: upload.id })

    const response = await sendCreate(cookie, { videoUploadId: upload.id })

    expect(response.status).toBe(422)
    expect(await db.select().from(media).where(eq(media.role, 'video'))).toHaveLength(1)
  })

  it('Given an unknown upload id, should reject without saving media', async () => {
    const cookie = await createOwnerSession()

    const response = await sendCreate(cookie, { videoUploadId: UNKNOWN_UPLOAD_ID })

    expect(response.status).toBe(422)
    expect(await db.select().from(media)).toEqual([])
  })

  it('Given both a file and an upload id, should reject and keep the upload', async () => {
    const cookie = await createOwnerSession()
    const upload = await seedReadyUpload()

    const response = await sendCreate(cookie, {
      videoUploadId: upload.id,
      file: new File(['video'], 'clip.webm', { type: 'video/webm' }),
    })

    expect(response.status).toBe(422)
    expect(await db.select().from(videoUpload)).toHaveLength(1)
  })

  it('Given a video without file or upload id, should reject', async () => {
    const cookie = await createOwnerSession()

    const response = await sendCreate(cookie, {})

    expect(response.status).toBe(422)
  })

  it('Given a JSON replacement, should swap the video and remove the old object', async () => {
    const cookie = await createOwnerSession()
    const first = await seedReadyUpload()
    const response = await sendCreate(cookie, { videoUploadId: first.id })
    const draft = decode(Models.Post, await response.json())
    const second = await seedReadyUpload()

    const replacement = await sendReplace(cookie, draft.id, { uploadId: second.id })
    const edited = decode(Models.Post, await replacement.json())
    const [stored] = await db.select().from(media).where(eq(media.role, 'video'))

    expect(replacement.status).toBe(200)
    expect(edited.video?.id).not.toBe(draft.video?.id)
    expect(stored?.key).toBe(second.key)
    expect(await storage.get(first.key)).toBeNull()
    expect(await storage.get(second.key)).not.toBeNull()
  })

  it('Given a JSON replacement with an unknown upload, should keep the current video', async () => {
    const cookie = await createOwnerSession()
    const first = await seedReadyUpload()
    const response = await sendCreate(cookie, { videoUploadId: first.id })
    const draft = decode(Models.Post, await response.json())

    const replacement = await sendReplace(cookie, draft.id, { uploadId: UNKNOWN_UPLOAD_ID })

    expect(replacement.status).toBe(422)
    expect(await storage.get(first.key)).not.toBeNull()
  })
})
