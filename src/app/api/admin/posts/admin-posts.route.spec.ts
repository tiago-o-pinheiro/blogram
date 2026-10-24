// @vitest-environment node
import { readdirSync } from 'node:fs'

import { StatusCodes } from 'http-status-codes'
import sharp from 'sharp'
import { beforeEach, describe, expect, it } from 'vitest'

import { type Models } from '@/models'

import { PUT as PUT_IMAGE } from '@/app/api/admin/posts/[id]/image/route'
import {
  DELETE as DELETE_POST,
  GET as GET_POST,
  PATCH as PATCH_POST,
} from '@/app/api/admin/posts/[id]/route'
import { PUT as PUT_STATUS } from '@/app/api/admin/posts/[id]/status/route'
import { GET as GET_POSTS, POST as POST_POST } from '@/app/api/admin/posts/route'
import { env } from '@/server/config/env'
import { db } from '@/server/lib/db'
import { storage } from '@/server/lib/storage'
import { media } from '@/server/modules/media/schemas/media.table'
import { createOwnerSession } from '@/test/auth-session'
import {
  createJpegWithGps,
  createOversizeBuffer,
  createPng,
  createTextAsJpg,
} from '@/test/image-fixtures'

const BASE_URL = 'http://localhost:3000/api/admin/posts'
const UNKNOWN_ID = 'AAAAAAAAAA'

const toFile = (data: Buffer, name: string, type: string) =>
  new File([new Uint8Array(data)], name, { type })

const withCookie = (cookie?: string): Record<string, string> => (cookie ? { cookie } : {})

const sendForm = (
  path: string,
  method: string,
  fields: Record<string, string | File>,
  cookie?: string,
) => {
  const form = new FormData()
  Object.entries(fields).forEach(([name, value]) => form.set(name, value))
  return new Request(`${BASE_URL}${path}`, { method, headers: withCookie(cookie), body: form })
}

const sendJson = (path: string, method: string, body: unknown, cookie?: string) =>
  new Request(`${BASE_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...withCookie(cookie) },
    body: JSON.stringify(body),
  })

const send = (path: string, method: string, cookie?: string) =>
  new Request(`${BASE_URL}${path}`, { method, headers: withCookie(cookie) })

const idContext = (id: string) => ({ params: Promise.resolve({ id }) })

const countStoredObjects = () =>
  readdirSync(env.STORAGE_LOCAL_DIR, { recursive: true, withFileTypes: true }).filter((entry) =>
    entry.isFile(),
  ).length

const readMediaKeys = async () => {
  const rows = await db.select().from(media)
  return rows.flatMap((row) => [row.key, ...row.variants.map((variant) => variant.key)])
}

describe('admin posts routes', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  const createPost = async (fields: Record<string, string> = {}) => {
    const file = toFile(await createJpegWithGps(), 'a.jpg', 'image/jpeg')
    const response = await POST_POST(
      sendForm('', 'POST', { type: 'photo', file, ...fields }, cookie),
    )
    const created: Models.Post = await response.json()
    return created
  }

  it('Given a title, should keep it on the photo and allow clearing it', async () => {
    const draft = await createPost({ title: ' ::title:: ' })
    expect(draft.title).toBe('::title::')

    const renamed = await PATCH_POST(
      sendJson(`/${draft.id}`, 'PATCH', { title: '::new title::' }, cookie),
      idContext(draft.id),
    )
    expect(await renamed.json()).toMatchObject({ title: '::new title::' })
    const cleared = await PATCH_POST(
      sendJson(`/${draft.id}`, 'PATCH', { title: '' }, cookie),
      idContext(draft.id),
    )
    expect(cleared.status).toBe(200)
    expect(await cleared.json()).not.toHaveProperty('title')
  })

  it('Given a place, should preserve it through publishing and allow removal', async () => {
    const place = {
      name: '::place::',
      mapUrl: 'https://www.openstreetmap.org/?mlat=40.4&mlon=-3.7#map=15/40.4/-3.7',
    }
    const draft = await createPost({ place: JSON.stringify(place) })
    expect(draft.place).toEqual(place)
    const published = await PUT_STATUS(
      sendJson(`/${draft.id}/status`, 'PUT', { status: 'published' }, cookie),
      idContext(draft.id),
    )
    expect(published.status).toBe(200)
    expect(await published.json()).toMatchObject({ status: 'published', place })
    const edited = await PATCH_POST(
      sendJson(`/${draft.id}`, 'PATCH', { text: '::text::' }, cookie),
      idContext(draft.id),
    )
    expect(await edited.json()).toMatchObject({ place })
    const removed = await PATCH_POST(
      sendJson(`/${draft.id}`, 'PATCH', { place: null }, cookie),
      idContext(draft.id),
    )
    expect(removed.status).toBe(200)
    expect(await removed.json()).not.toHaveProperty('place')
  })

  it.each([
    '{',
    JSON.stringify({ name: '   ' }),
    JSON.stringify({ name: '::place::', mapUrl: 'javascript:alert(1)' }),
    JSON.stringify({ name: '::place::', mapUrl: 'https://openstreetmap.org.evil.test/' }),
  ])('Given invalid place %s, should reject the draft', async (place) => {
    const response = await POST_POST(sendForm('', 'POST', { type: 'photo', place }, cookie))
    expect(response.status).toBe(422)
  })

  it('Given no session, should answer 401 on every posts route', async () => {
    const file = toFile(await createPng(), 'a.png', 'image/png')

    const responses = await Promise.all([
      GET_POSTS(send('', 'GET')),
      POST_POST(sendForm('', 'POST', { type: 'photo', file })),
      GET_POST(send(`/${UNKNOWN_ID}`, 'GET'), idContext(UNKNOWN_ID)),
      PATCH_POST(sendJson(`/${UNKNOWN_ID}`, 'PATCH', { text: 'x' }), idContext(UNKNOWN_ID)),
      DELETE_POST(send(`/${UNKNOWN_ID}`, 'DELETE'), idContext(UNKNOWN_ID)),
      PUT_IMAGE(sendForm(`/${UNKNOWN_ID}/image`, 'PUT', { file }), idContext(UNKNOWN_ID)),
      PUT_STATUS(
        sendJson(`/${UNKNOWN_ID}/status`, 'PUT', { status: 'published' }),
        idContext(UNKNOWN_ID),
      ),
    ])

    expect(responses.map((response) => response.status)).toEqual(
      responses.map(() => StatusCodes.UNAUTHORIZED),
    )
  })

  it('Given a photo with text and alt text, should answer 201 with a draft and persist both', async () => {
    const created = await createPost({ text: 'Hello', altText: 'A red square' })
    const read = await GET_POST(send(`/${created.id}`, 'GET', cookie), idContext(created.id))

    expect(created).toMatchObject({
      type: 'photo',
      status: 'draft',
      text: 'Hello',
      image: { altText: 'A red square' },
    })
    expect(await read.json()).toEqual(created)
  })

  it('Given a JPEG with GPS, should store EXIF-free objects', async () => {
    await createPost()

    const keys = await readMediaKeys()
    const metadata = await Promise.all(
      keys.map(async (key) => {
        const stored = await storage.get(key)
        return sharp(stored?.body).metadata()
      }),
    )

    expect(keys.length).toBeGreaterThan(0)
    metadata.forEach((entry) => {
      expect(entry.exif).toBeUndefined()
    })
  })

  it('Given a fake image type, should answer 422 and store nothing', async () => {
    const before = countStoredObjects()

    const response = await POST_POST(
      sendForm(
        '',
        'POST',
        { type: 'photo', file: toFile(createTextAsJpg(), 'a.jpg', 'image/jpeg') },
        cookie,
      ),
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(countStoredObjects()).toBe(before)
  })

  it('Given an oversize image, should answer 413 and store nothing', async () => {
    const before = countStoredObjects()
    const oversize = createOversizeBuffer(env.UPLOAD_MAX_IMAGE_BYTES)

    const response = await POST_POST(
      sendForm(
        '',
        'POST',
        { type: 'photo', file: toFile(oversize, 'a.jpg', 'image/jpeg') },
        cookie,
      ),
    )

    expect(response.status).toBe(413)
    expect(countStoredObjects()).toBe(before)
  })

  it('Given a missing file or a non-file file field, should answer 422', async () => {
    const missing = await POST_POST(sendForm('', 'POST', { type: 'photo' }, cookie))
    const text = await POST_POST(sendForm('', 'POST', { type: 'photo', file: 'text' }, cookie))

    expect(missing.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(text.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a patch, should update text and alt text', async () => {
    const created = await createPost({ text: 'Old', altText: 'Old alt' })

    const response = await PATCH_POST(
      sendJson(`/${created.id}`, 'PATCH', { text: 'New', altText: 'New alt' }, cookie),
      idContext(created.id),
    )

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toMatchObject({ text: 'New', image: { altText: 'New alt' } })
  })

  it('Given an empty patch, should answer 422', async () => {
    const created = await createPost()

    const response = await PATCH_POST(
      sendJson(`/${created.id}`, 'PATCH', {}, cookie),
      idContext(created.id),
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given an unknown post id, should answer 404', async () => {
    const response = await GET_POST(send(`/${UNKNOWN_ID}`, 'GET', cookie), idContext(UNKNOWN_ID))

    expect(response.status).toBe(StatusCodes.NOT_FOUND)
  })

  it('Given a new image, should replace the stored objects', async () => {
    const created = await createPost()
    const previousKeys = await readMediaKeys()

    const response = await PUT_IMAGE(
      sendForm(
        `/${created.id}/image`,
        'PUT',
        { file: toFile(await createPng(), 'b.png', 'image/png') },
        cookie,
      ),
      idContext(created.id),
    )

    const currentKeys = await readMediaKeys()
    expect(response.status).toBe(StatusCodes.OK)
    expect(currentKeys.some((key) => previousKeys.includes(key))).toBe(false)
    expect(await storage.get(previousKeys[0] ?? '')).toBeNull()
    expect(await storage.get(currentKeys[0] ?? '')).not.toBeNull()
  })

  it('Given status changes, should publish, stay idempotent and unpublish', async () => {
    const created = await createPost()
    const change = (status: string) =>
      PUT_STATUS(
        sendJson(`/${created.id}/status`, 'PUT', { status }, cookie),
        idContext(created.id),
      )

    const published = await (await change('published')).json()
    const publishedAgain = await (await change('published')).json()
    const draft = await (await change('draft')).json()
    const invalid = await change('archived')

    expect(published.status).toBe('published')
    expect(published.publishedAt).not.toBeNull()
    expect(publishedAgain.publishedAt).toBe(published.publishedAt)
    expect(draft.status).toBe('draft')
    expect(invalid.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given several posts, should list them paginated and filtered by status', async () => {
    const first = await createPost()
    const second = await createPost()
    await createPost()
    await PUT_STATUS(
      sendJson(`/${first.id}/status`, 'PUT', { status: 'published' }, cookie),
      idContext(first.id),
    )
    await PUT_STATUS(
      sendJson(`/${second.id}/status`, 'PUT', { status: 'published' }, cookie),
      idContext(second.id),
    )

    const all = await (await GET_POSTS(send('?page=1&pageSize=2', 'GET', cookie))).json()
    const secondPage = await (await GET_POSTS(send('?page=2&pageSize=2', 'GET', cookie))).json()
    const drafts = await (await GET_POSTS(send('?status=draft', 'GET', cookie))).json()
    const invalid = await GET_POSTS(send('?status=archived', 'GET', cookie))

    expect(all.data).toHaveLength(2)
    expect(all.meta).toEqual({ total: 3, page: 1, pageSize: 2 })
    expect(all.data[0].id).toBe(second.id)
    expect(secondPage.data).toHaveLength(1)
    expect(drafts.data).toHaveLength(1)
    expect(drafts.data[0].status).toBe('draft')
    expect(invalid.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given a post, should delete it with all its stored objects', async () => {
    const created = await createPost()
    const keys = await readMediaKeys()

    const response = await DELETE_POST(
      send(`/${created.id}`, 'DELETE', cookie),
      idContext(created.id),
    )
    const read = await GET_POST(send(`/${created.id}`, 'GET', cookie), idContext(created.id))

    expect(response.status).toBe(StatusCodes.NO_CONTENT)
    expect(read.status).toBe(StatusCodes.NOT_FOUND)
    expect(await readMediaKeys()).toEqual([])
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(await storage.get(key)).toBeNull()
    }
  })
})
