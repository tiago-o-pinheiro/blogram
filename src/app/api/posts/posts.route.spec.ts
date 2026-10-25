import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { postService } from '@/server/modules/posts/services/post.service'
import { profileService } from '@/server/modules/profile/services/profile.service'
import { createPng } from '@/test/image-fixtures'

import { GET as getCard } from './[id]/card/route'
import { POST as like } from './[id]/like/route'
import { GET as get } from './[id]/route'
import { GET as list } from './route'

const context = (id: string) => ({ params: Promise.resolve({ id }) })
const request = (path = '', init?: RequestInit) =>
  new Request(`http://localhost:3000/api/posts${path}`, init)
const seedPost = async (overrides: Partial<typeof post.$inferInsert> = {}) => {
  const [row] = await db
    .insert(post)
    .values({
      publicId: 'Abcde12345',
      type: 'photo',
      status: 'published',
      text: '::caption::',
      publishedAt: new Date('2026-10-20T12:00:00Z'),
      ...overrides,
    })
    .returning()
  return row
}

describe('Public posts HTTP', () => {
  it('Given drafts and publications, should expose only published content', async () => {
    await seedPost()
    await seedPost({ publicId: 'Draft12345', status: 'draft', text: '::private-caption::' })

    const response = await list(request())
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(Models.isPostPage(body)).toBe(true)
    expect(body).toMatchObject({ data: [{ id: 'Abcde12345' }], meta: { total: 1 } })
    expect(JSON.stringify(body)).not.toContain('::private-caption::')
  })

  it('Given video and YouTube posts, should include both in videos', async () => {
    await seedPost({ type: 'video' })
    await seedPost({
      publicId: 'Youtube123',
      type: 'youtube',
      publishedAt: new Date('2026-10-21T12:00:00Z'),
    })
    await seedPost({ publicId: 'Photo12345', type: 'photo' })

    const response = await list(request('?type=video&pageSize=1&page=2'))

    expect(await response.json()).toMatchObject({
      data: [{ id: 'Abcde12345', type: 'video' }],
      meta: { total: 2, page: 2, pageSize: 1 },
    })
  })

  it('Given a search term, should match caption, title, link details and place case-insensitively', async () => {
    await seedPost({ publicId: 'Caption123', text: 'Sunset over the BAY' })
    await seedPost({ publicId: 'Title12345', title: 'Bay walk', text: '' })
    await seedPost({
      publicId: 'Link123456',
      type: 'link',
      text: '',
      details: { url: 'https://example.test', source: 'bay.example.test' },
    })
    await seedPost({
      publicId: 'Place12345',
      text: '',
      place: { name: 'Bayside', mapUrl: 'https://www.openstreetmap.org/#map=10/1/2' },
    })
    await seedPost({ publicId: 'Other12345', text: 'Mountains' })
    await seedPost({ publicId: 'Draft12345', status: 'draft', text: 'bay draft' })

    const response = await list(request('?q=bay'))
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(Models.isPostPage(body)).toBe(true)
    expect(body).toMatchObject({ meta: { total: 4 } })
    expect(JSON.stringify(body)).not.toContain('Other12345')
    expect(JSON.stringify(body)).not.toContain('Draft12345')
  })

  it('Given a term with wildcard characters, should treat them literally', async () => {
    await seedPost({ publicId: 'Percent123', text: '100% sure' })
    await seedPost({ publicId: 'Plain12345', text: '100 sure' })
    await seedPost({ publicId: 'Under12345', text: 'a_b' })
    await seedPost({ publicId: 'Other12345', text: 'axb' })

    const percent: unknown = await (await list(request('?q=100%25'))).json()
    const underscore: unknown = await (await list(request('?q=a_b'))).json()

    expect(percent).toMatchObject({ data: [{ id: 'Percent123' }], meta: { total: 1 } })
    expect(underscore).toMatchObject({ data: [{ id: 'Under12345' }], meta: { total: 1 } })
  })

  it('Given a search with a type filter, should keep both', async () => {
    await seedPost({ publicId: 'Photo12345', text: 'harbour' })
    await seedPost({ publicId: 'Video12345', type: 'video', text: 'harbour' })

    const body: unknown = await (await list(request('?q=harbour&type=video'))).json()

    expect(body).toMatchObject({ data: [{ id: 'Video12345' }], meta: { total: 1 } })
  })

  it.each(['?q=', `?q=${'a'.repeat(101)}`])(
    'Given invalid search %s, should reject it',
    async (query) => {
      expect((await list(request(query))).status).toBe(422)
    },
  )

  it.each(['?type=invalid', '?page=0', '?pageSize=101', '?page=2x'])(
    'Given invalid query %s, should reject it',
    async (query) => {
      expect((await list(request(query))).status).toBe(422)
    },
  )

  it('Given a video poster and a photo with camera metadata, should expose camera only for the photo', async () => {
    const metadata = {
      camera: { make: 'Canon', model: 'R5' },
      placeholder: 'data:image/webp;base64,AAAA',
    }
    const seedImage = async (publicId: string, type: 'photo' | 'video') => {
      const row = await seedPost({ publicId, type })
      if (!row) {
        throw new Error('seed failed')
      }
      await db.insert(media).values({
        postId: row.id,
        key: `${publicId}/original`,
        contentType: 'image/webp',
        width: 10,
        height: 10,
        sizeBytes: 1,
        metadata,
      })
    }
    await seedImage('Video12345', 'video')
    await seedImage('Photo12345', 'photo')

    const listed: unknown = await (await list(request())).json()
    const videoPage: unknown = await (
      await get(request('/Video12345'), context('Video12345'))
    ).json()
    const photoPage: unknown = await (
      await get(request('/Photo12345'), context('Photo12345'))
    ).json()

    expect(listed).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'Video12345',
          image: expect.objectContaining({ placeholder: metadata.placeholder }),
        }),
      ]),
    })
    expect(listed).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'Photo12345',
          image: expect.objectContaining({ camera: metadata.camera }),
        }),
      ]),
    })
    expect(JSON.stringify(listed).match(/Canon/g)).toHaveLength(1)
    expect(JSON.stringify(videoPage)).not.toContain('Canon')
    expect(videoPage).toMatchObject({ image: { placeholder: metadata.placeholder } })
    expect(photoPage).toMatchObject({
      image: { camera: metadata.camera, placeholder: metadata.placeholder },
    })
  })

  it('Given a draft or missing post, should hide pages and likes', async () => {
    await seedPost({ status: 'draft' })

    expect((await get(request('/Abcde12345'), context('Abcde12345'))).status).toBe(404)
    expect(
      (await like(request('/Abcde12345/like', { method: 'POST' }), context('Abcde12345'))).status,
    ).toBe(404)
    expect((await get(request('/Missing123'), context('Missing123'))).status).toBe(404)
    expect((await getCard(request('/Abcde12345/card'), context('Abcde12345'))).status).toBe(404)
  })

  it('Given an invalid permanent id, should reject it', async () => {
    expect((await get(request('/bad'), context('bad'))).status).toBe(422)
  })

  it('Given concurrent anonymous likes, should increment every vote atomically', async () => {
    await seedPost()

    const responses = await Promise.all(
      Array.from({ length: 20 }, async () =>
        like(
          request('/Abcde12345/like', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ likes: 90000 }),
          }),
          context('Abcde12345'),
        ),
      ),
    )
    const [row] = await db
      .select({ likes: post.likes })
      .from(post)
      .where(eq(post.publicId, 'Abcde12345'))

    expect(responses.every((response) => response.status === 200)).toBe(true)
    expect(row?.likes).toBe(20)
  })

  it('Given a published photo, should generate story and Open Graph images', async () => {
    await profileService.saveProfile({ name: '::owner::', description: '::about::' })
    const draft = await postService.createPhotoDraft({
      file: new File([new Uint8Array(await createPng())], 'photo.png', { type: 'image/png' }),
      text: '::caption::',
      altText: '::alt::',
    })
    await postService.setStatus(draft.id, 'published')

    const story = await getCard(request(`/${draft.id}/card`), context(draft.id))
    const og = await getCard(request(`/${draft.id}/card?format=og`), context(draft.id))

    expect(story.status).toBe(200)
    expect(story.headers.get('Content-Disposition')).toContain('attachment')
    expect(await sharp(Buffer.from(await story.arrayBuffer())).metadata()).toMatchObject({
      width: 1080,
      height: 1920,
      format: 'png',
    })
    expect(await sharp(Buffer.from(await og.arrayBuffer())).metadata()).toMatchObject({
      width: 1200,
      height: 630,
    })
    await postService.setStatus(draft.id, 'draft')
    expect((await getCard(request(`/${draft.id}/card`), context(draft.id))).status).toBe(404)
  })
})
