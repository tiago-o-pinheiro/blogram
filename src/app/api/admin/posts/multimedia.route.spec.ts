// @vitest-environment node
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { POST as POST_METADATA } from '@/app/api/admin/metadata/route'
import { DELETE, PATCH } from '@/app/api/admin/posts/[id]/route'
import { PUT as PUT_STATUS } from '@/app/api/admin/posts/[id]/status/route'
import { PUT as PUT_VIDEO } from '@/app/api/admin/posts/[id]/video/route'
import { POST } from '@/app/api/admin/posts/route'
import { GET as GET_MEDIA, HEAD as HEAD_MEDIA } from '@/app/api/media/[id]/route'
import { decode } from '@/server/lib/codec'
import { db } from '@/server/lib/db'
import { storage } from '@/server/lib/storage'
import { media } from '@/server/modules/media/schemas/media.table'
import { createOwnerSession } from '@/test/auth-session'
import { createPng } from '@/test/image-fixtures'
import { createWebm } from '@/test/video-fixtures'

const BASE_URL = 'http://localhost:3000'
const context = (id: string) => ({ params: Promise.resolve({ id }) })
const sendForm = (
  fields: Record<string, string | File>,
  cookie: string,
  path = '/api/admin/posts',
  method = 'POST',
) => {
  const form = new FormData()
  Object.entries(fields).forEach(([name, value]) => form.set(name, value))
  return new Request(`${BASE_URL}${path}`, {
    method,
    headers: { cookie },
    body: form,
  })
}
const sendJson = (path: string, method: string, body: unknown, cookie?: string) =>
  new Request(`${BASE_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })
const videoFields = async () => ({
  type: 'video',
  file: new File([new Uint8Array(await createWebm())], 'clip.webm', { type: 'video/webm' }),
  poster: new File([new Uint8Array(await createPng())], 'poster.png', { type: 'image/png' }),
})

describe('multimedia post routes', () => {
  it('Given a valid vertical video and poster, should protect drafts and serve published byte ranges', async () => {
    const cookie = await createOwnerSession()
    const fields = await videoFields()
    const response = await POST(sendForm(fields, cookie))
    const draft = decode(Models.Post, await response.json())
    const id = draft.video?.id ?? ''
    const hidden = await GET_MEDIA(new Request(`${BASE_URL}/api/media/${id}`), context(id))

    const published = await PUT_STATUS(
      sendJson(`/api/admin/posts/${draft.id}/status`, 'PUT', { status: 'published' }, cookie),
      context(draft.id),
    )
    const partial = await GET_MEDIA(
      new Request(`${BASE_URL}/api/media/${id}`, { headers: { range: 'bytes=0-15' } }),
      context(id),
    )
    const head = await HEAD_MEDIA(
      new Request(`${BASE_URL}/api/media/${id}`, { method: 'HEAD' }),
      context(id),
    )
    const invalid = await GET_MEDIA(
      new Request(`${BASE_URL}/api/media/${id}`, { headers: { range: 'bytes=999999-' } }),
      context(id),
    )

    expect(response.status).toBe(201)
    expect(draft.video).toMatchObject({ width: 64, height: 96, contentType: 'video/webm' })
    expect(draft.image).not.toBeNull()
    expect(hidden.status).toBe(404)
    expect(published.status).toBe(200)
    expect(partial.status).toBe(206)
    expect(partial.headers.get('content-type')).toBe('video/webm')
    expect(partial.headers.get('content-range')).toBe(`bytes 0-15/${fields.file.size}`)
    expect(new Uint8Array(await partial.arrayBuffer())).toEqual(
      new Uint8Array(await fields.file.arrayBuffer()).slice(0, 16),
    )
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe(String(fields.file.size))
    expect(await head.text()).toBe('')
    expect(invalid.status).toBe(416)
  })

  it('Given a video without poster, should reject without saving media', async () => {
    const cookie = await createOwnerSession()
    const fields = await videoFields()

    const response = await POST(sendForm({ type: 'video', file: fields.file }, cookie))

    expect(response.status).toBe(422)
    expect(await db.select().from(media)).toEqual([])
  })

  it('Given disguised text as video, should reject and clean its processed poster', async () => {
    const cookie = await createOwnerSession()
    const fields = await videoFields()

    const response = await POST(
      sendForm(
        { ...fields, file: new File(['not video'], 'fake.mp4', { type: 'video/mp4' }) },
        cookie,
      ),
    )

    expect(response.status).toBe(422)
    expect(await db.select().from(media)).toEqual([])
  })

  it('Given a video deletion, should remove the poster and video objects', async () => {
    const cookie = await createOwnerSession()
    const response = await POST(sendForm(await videoFields(), cookie))
    const draft = decode(Models.Post, await response.json())
    const rows = await db.select().from(media)

    const deletion = await DELETE(
      new Request(`${BASE_URL}/api/admin/posts/${draft.id}`, {
        method: 'DELETE',
        headers: { cookie },
      }),
      context(draft.id),
    )

    expect(deletion.status).toBe(204)
    expect(rows.map((row) => row.role).sort()).toEqual(['image', 'video'])
    expect(await Promise.all(rows.map((row) => storage.get(row.key)))).toEqual([null, null])
  })

  it('Given a replacement video, should keep its poster and remove the old video', async () => {
    const cookie = await createOwnerSession()
    const fields = await videoFields()
    const response = await POST(sendForm(fields, cookie))
    const draft = decode(Models.Post, await response.json())
    const [previous] = await db.select().from(media).where(eq(media.role, 'video'))

    const replacement = await PUT_VIDEO(
      sendForm({ file: fields.file }, cookie, `/api/admin/posts/${draft.id}/video`, 'PUT'),
      context(draft.id),
    )
    const edited = decode(Models.Post, await replacement.json())

    expect(replacement.status).toBe(200)
    expect(edited.image?.id).toBe(draft.image?.id)
    expect(edited.video?.id).not.toBe(draft.video?.id)
    expect(await storage.get(previous?.key ?? '')).toBeNull()
  })

  it('Given anonymous video replacement, should require an owner session', async () => {
    const response = await PUT_VIDEO(
      sendForm(
        { file: new File(['video'], 'clip.mp4') },
        '',
        '/api/admin/posts/AAAAAAAAAA/video',
        'PUT',
      ),
      context('AAAAAAAAAA'),
    )

    expect(response.status).toBe(401)
  })

  it('Given an unknown post for video replacement, should return not found', async () => {
    const cookie = await createOwnerSession()

    const response = await PUT_VIDEO(
      sendForm(
        { file: new File(['video'], 'clip.mp4') },
        cookie,
        '/api/admin/posts/AAAAAAAAAA/video',
        'PUT',
      ),
      context('AAAAAAAAAA'),
    )

    expect(response.status).toBe(404)
  })

  it('Given a missing replacement video, should reject the incomplete input', async () => {
    const cookie = await createOwnerSession()

    const response = await PUT_VIDEO(
      sendForm({}, cookie, '/api/admin/posts/AAAAAAAAAA/video', 'PUT'),
      context('AAAAAAAAAA'),
    )

    expect(response.status).toBe(422)
  })

  it('Given a YouTube short URL, should normalize and publish without uploading files', async () => {
    const cookie = await createOwnerSession()
    const response = await POST(
      sendForm({ type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ?t=12' }, cookie),
    )
    const draft = decode(Models.Post, await response.json())

    const published = await PUT_STATUS(
      sendJson(`/api/admin/posts/${draft.id}/status`, 'PUT', { status: 'published' }, cookie),
      context(draft.id),
    )

    expect(response.status).toBe(201)
    expect(draft.youtube?.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(published.status).toBe(200)
    expect(await db.select().from(media)).toEqual([])
  })

  it.each(['link', 'news'])(
    'Given a manual %s without preview, should publish and retain editable source fields',
    async (type) => {
      const cookie = await createOwnerSession()
      const response = await POST(
        sendForm(
          {
            type,
            url: 'https://example.com/article',
            title: 'An article',
            description: 'A short excerpt',
            source: 'Original publisher',
            text: 'My comment',
          },
          cookie,
        ),
      )
      const draft = decode(Models.Post, await response.json())

      const edit = await PATCH(
        sendJson(
          `/api/admin/posts/${draft.id}`,
          'PATCH',
          { title: 'Edited title', source: 'Named source', description: 'Manual excerpt' },
          cookie,
        ),
        context(draft.id),
      )
      const publication = await PUT_STATUS(
        sendJson(`/api/admin/posts/${draft.id}/status`, 'PUT', { status: 'published' }, cookie),
        context(draft.id),
      )

      expect(response.status).toBe(201)
      expect(draft.image).toBeNull()
      expect(draft.type).toBe(type)
      expect(await edit.json()).toMatchObject({
        text: 'My comment',
        link: { title: 'Edited title', source: 'Named source', description: 'Manual excerpt' },
      })
      expect(publication.status).toBe(200)
    },
  )

  it('Given a link cover upload, should process it as protected media', async () => {
    const cookie = await createOwnerSession()
    const response = await POST(
      sendForm(
        {
          type: 'link',
          url: 'https://example.com/article',
          title: 'An article',
          file: new File([new Uint8Array(await createPng())], 'cover.png', { type: 'image/png' }),
        },
        cookie,
      ),
    )
    const draft = decode(Models.Post, await response.json())

    expect(draft.image).toMatchObject({ width: 64, height: 64 })
    expect(draft.link?.source).toBe('example.com')
  })

  it.each<Record<string, string | File>>([
    { type: 'youtube', url: 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ' },
    { type: 'link', url: 'javascript:alert(1)', title: 'Unsafe' },
    { type: 'news', url: 'https://example.com/article', title: '' },
  ])('Given invalid post fields %j, should reject publishing input', async (fields) => {
    const cookie = await createOwnerSession()

    const response = await POST(sendForm(fields, cookie))

    expect(response.status).toBe(422)
  })

  it('Given anonymous metadata discovery, should require the owner session', async () => {
    const response = await POST_METADATA(
      sendJson('/api/admin/metadata', 'POST', { url: 'https://example.com' }),
    )

    expect(response.status).toBe(401)
  })

  it('Given a private metadata URL, should fall back without exposing internal content', async () => {
    const cookie = await createOwnerSession()

    const response = await POST_METADATA(
      sendJson('/api/admin/metadata', 'POST', { url: 'http://127.0.0.1/private' }, cookie),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      url: 'http://127.0.0.1/private',
      title: '',
      description: '',
      source: '127.0.0.1',
    })
  })
})
