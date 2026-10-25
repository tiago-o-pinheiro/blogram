import { afterEach, describe, expect, it, vi } from 'vitest'

import { PostsApiError } from './posts-api'
import { abortVideoUpload, completeVideoUpload, startVideoUpload } from './video-upload-api'

const SESSION = {
  id: '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f',
  partSize: 10485760,
  parts: [{ partNumber: 1, url: 'https://bucket/part-1' }],
  expiresAt: '2026-10-25T10:00:00.000Z',
}
const READY = {
  id: SESSION.id,
  contentType: 'video/mp4',
  size: 100,
  width: 640,
  height: 360,
}

const mockFetch = (response: Response) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

describe('video upload api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given a start request, should post JSON with same-origin credentials and decode the session', async () => {
    const fetchSpy = mockFetch(Response.json(SESSION, { status: 201 }))

    await expect(startVideoUpload({ contentType: 'video/mp4', size: 100 })).resolves.toEqual(
      SESSION,
    )

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/admin/uploads/video'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ contentType: 'video/mp4', size: 100 }),
      }),
    )
  })

  it('Given a malformed session, should throw a PostsApiError', async () => {
    mockFetch(Response.json({ id: 'x' }, { status: 201 }))

    await expect(startVideoUpload({ contentType: 'video/mp4', size: 100 })).rejects.toBeInstanceOf(
      PostsApiError,
    )
  })

  it('Given a 413 response, should throw its status', async () => {
    mockFetch(new Response(null, { status: 413 }))

    await expect(startVideoUpload({ contentType: 'video/mp4', size: 100 })).rejects.toMatchObject({
      status: 413,
      reason: 'status',
    })
  })

  it('Given a fetch TypeError, should throw interrupted with status 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(startVideoUpload({ contentType: 'video/mp4', size: 100 })).rejects.toMatchObject({
      status: 0,
      reason: 'interrupted',
    })
  })

  it('Given ETags, should post them to complete and decode the ready upload', async () => {
    const fetchSpy = mockFetch(Response.json(READY))

    await expect(
      completeVideoUpload(SESSION.id, [{ partNumber: 1, etag: '"abc"' }]),
    ).resolves.toEqual(READY)

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/admin/uploads/video/${SESSION.id}/complete`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ parts: [{ partNumber: 1, etag: '"abc"' }] }),
      }),
    )
  })

  it('Given a failing abort, should not throw', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(abortVideoUpload(SESSION.id)).resolves.toBeUndefined()
  })
})
