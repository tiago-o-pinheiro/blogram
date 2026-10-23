// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import sharp from 'sharp'
import { beforeEach, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/media/[id]/route'
import { postService } from '@/server/modules/posts/services/post.service'
import { createOwnerSession } from '@/test/auth-session'
import { createWideJpegWithGps } from '@/test/image-fixtures'

const BASE_URL = 'http://localhost:3000/api/media'

const getMedia = (id: string, variant?: string, cookie?: string) =>
  GET(
    new Request(`${BASE_URL}/${id}${variant ? `?variant=${variant}` : ''}`, {
      headers: cookie ? { cookie } : {},
    }),
    { params: Promise.resolve({ id }) },
  )

const createDraft = async () => {
  const file = new File([new Uint8Array(await createWideJpegWithGps(2000, 1000))], 'a.jpg', {
    type: 'image/jpeg',
  })
  const created = await postService.createPhotoDraft({ text: 'hi', altText: 'alt', file })
  const imageId = created.image?.id
  if (!imageId) {
    throw new Error('Draft has no image')
  }
  return { postId: created.id, imageId }
}

const readWidth = async (response: Response) =>
  (await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width

describe('media route', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  it('Given a draft post, should answer 404 to anonymous callers', async () => {
    const { imageId } = await createDraft()

    expect((await getMedia(imageId)).status).toBe(StatusCodes.NOT_FOUND)
  })

  it('Given a draft post, should answer the owner 200 with private no-store', async () => {
    const { imageId } = await createDraft()

    const response = await getMedia(imageId, undefined, cookie)

    expect(response.status).toBe(StatusCodes.OK)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('Given published media, should revalidate every access before serving cached bytes', async () => {
    const { postId, imageId } = await createDraft()
    await postService.setStatus(postId, 'published')

    const response = await getMedia(imageId)
    const cacheControl = response.headers.get('Cache-Control') ?? ''
    const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1])

    expect(response.status).toBe(StatusCodes.OK)
    expect(cacheControl).toBe('public, max-age=0, must-revalidate')
    expect(cacheControl).not.toContain('immutable')
    expect(cacheControl).not.toContain('s-maxage')
    expect(maxAge).toBe(0)
  })

  it('Given a published post that is unpublished, should answer 404 again', async () => {
    const { postId, imageId } = await createDraft()
    await postService.setStatus(postId, 'published')
    await postService.setStatus(postId, 'draft')

    expect((await getMedia(imageId)).status).toBe(StatusCodes.NOT_FOUND)
  })

  it('Given a variant query, should return smaller widths and 404 for unknown variants', async () => {
    const { postId, imageId } = await createDraft()
    await postService.setStatus(postId, 'published')

    const small = await readWidth(await getMedia(imageId, 'w480'))
    const full = await readWidth(await getMedia(imageId))

    expect(small).toBe(480)
    expect(full).toBe(2000)
    expect((await getMedia(imageId, 'w123')).status).toBe(StatusCodes.NOT_FOUND)
  })

  it('Given a deleted post, should answer 404', async () => {
    const { postId, imageId } = await createDraft()
    await postService.setStatus(postId, 'published')
    await postService.deletePost(postId)

    expect((await getMedia(imageId, undefined, cookie)).status).toBe(StatusCodes.NOT_FOUND)
  })
})
