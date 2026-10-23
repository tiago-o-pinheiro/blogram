import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createPhotoPost,
  deletePost,
  PostsApiError,
  replacePostImage,
  setPostStatus,
  updatePost,
} from './posts-api'

const POST = {
  id: 'AbCdEfGhIj',
  type: 'photo',
  status: 'draft',
  text: 'Hello',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
  image: null,
}

const mockFetch = (response: Response) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

const FILE = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })

describe('posts api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given a photo, should post multipart fields and decode the created post', async () => {
    const fetchSpy = mockFetch(Response.json(POST, { status: 201 }))

    await expect(createPhotoPost({ file: FILE, text: 'Hello', altText: 'Alt' })).resolves.toEqual(
      POST,
    )

    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('/api/admin/posts')
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' })
    const body = init?.body
    expect(body).toBeInstanceOf(FormData)
    if (body instanceof FormData) {
      expect(body.get('type')).toBe('photo')
      expect(body.get('text')).toBe('Hello')
      expect(body.get('altText')).toBe('Alt')
      expect(body.get('file')).toBeInstanceOf(File)
    }
  })

  it('Given an edit, should patch the JSON body', async () => {
    const fetchSpy = mockFetch(Response.json(POST))

    await expect(updatePost(POST.id, { text: 'New' })).resolves.toEqual(POST)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts/AbCdEfGhIj',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ text: 'New' }) }),
    )
  })

  it('Given a new file, should put it to the image endpoint', async () => {
    const fetchSpy = mockFetch(Response.json(POST))

    await expect(replacePostImage(POST.id, FILE)).resolves.toEqual(POST)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts/AbCdEfGhIj/image',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('Given a status, should put it to the status endpoint', async () => {
    const fetchSpy = mockFetch(Response.json({ ...POST, status: 'published' }))

    await expect(setPostStatus(POST.id, 'published')).resolves.toMatchObject({
      status: 'published',
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts/AbCdEfGhIj/status',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'published' }) }),
    )
  })

  it('Given a delete, should resolve on 204', async () => {
    const fetchSpy = mockFetch(new Response(null, { status: 204 }))

    await expect(deletePost(POST.id)).resolves.toBeUndefined()

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/posts/AbCdEfGhIj',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it.each([401, 413, 422, 500])('Given a %i response, should throw its status', async (status) => {
    mockFetch(new Response(null, { status }))

    await expect(deletePost(POST.id)).rejects.toMatchObject({ status })
  })

  it('Given a malformed post body, should throw a PostsApiError', async () => {
    mockFetch(Response.json({ id: 'nope' }))

    await expect(updatePost(POST.id, { text: 'x' })).rejects.toBeInstanceOf(PostsApiError)
  })
})
