import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as Models from '@/models/models'

import {
  PART_ATTEMPTS,
  PART_CONCURRENCY,
  uploadVideoDirect,
  uploadVideoParts,
  type PartTransport,
} from './upload-video-parts'
import { PostsApiError } from '../api/posts-api'

const PART_SIZE = 4
const SESSION: Models.VideoUploadSession = {
  id: '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f',
  partSize: PART_SIZE,
  parts: [1, 2, 3].map((partNumber) => ({ partNumber, url: `https://bucket/part-${partNumber}` })),
  expiresAt: '2026-10-25T10:00:00.000Z',
}
const FILE = new File(['aaaabbbbcc'], 'clip.mp4', { type: 'video/mp4' })

const okTransport: PartTransport = async ({ url, body, onProgress }) => {
  onProgress(body.size)
  return { status: 200, etag: `"etag-${url.slice(-1)}"` }
}

const instantWait = () => Promise.resolve()

describe('uploadVideoParts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given a file, should send sliced parts and return ETags sorted by part number', async () => {
    const sizes: number[] = []
    const transport: PartTransport = async (request) => {
      sizes.push(request.body.size)
      return okTransport(request)
    }

    const etags = await uploadVideoParts({
      file: FILE,
      session: SESSION,
      onProgress: vi.fn(),
      transport,
      wait: instantWait,
    })

    expect(sizes.sort()).toEqual([2, 4, 4])
    expect(etags).toEqual([
      { partNumber: 1, etag: '"etag-1"' },
      { partNumber: 2, etag: '"etag-2"' },
      { partNumber: 3, etag: '"etag-3"' },
    ])
  })

  it('Given many parts, should never run more than the concurrency limit', async () => {
    let active = 0
    let peak = 0
    const session = {
      ...SESSION,
      parts: Array.from({ length: 8 }, (_, index) => ({
        partNumber: index + 1,
        url: `https://bucket/part-${index + 1}`,
      })),
    }
    const transport: PartTransport = async (request) => {
      active += 1
      peak = Math.max(peak, active)
      await Promise.resolve()
      await Promise.resolve()
      active -= 1
      return okTransport(request)
    }

    await uploadVideoParts({
      file: new File(['x'.repeat(32)], 'clip.mp4'),
      session,
      onProgress: vi.fn(),
      transport,
      wait: instantWait,
    })

    expect(peak).toBe(PART_CONCURRENCY)
  })

  it('Given a part that fails with 503 then succeeds, should retry with backoff and keep progress monotonic', async () => {
    const attempts = new Map<string, number>()
    const waits: number[] = []
    const fractions: number[] = []
    const transport: PartTransport = async (request) => {
      const count = (attempts.get(request.url) ?? 0) + 1
      attempts.set(request.url, count)
      if (request.url.endsWith('2') && count < 3) {
        request.onProgress(2)
        return { status: 503, etag: null }
      }
      return okTransport(request)
    }

    await uploadVideoParts({
      file: FILE,
      session: SESSION,
      onProgress: (fraction) => fractions.push(fraction),
      transport,
      wait: async (ms) => {
        waits.push(ms)
      },
    })

    expect(waits).toEqual([1000, 2000])
    expect(fractions).toEqual([...fractions].sort((first, second) => first - second))
    expect(fractions.at(-1)).toBe(1)
  })

  it('Given a network error, 408 and 429, should retry the part', async () => {
    const statuses = [0, 408, 429]
    const transport: PartTransport = async (request) => {
      const status = request.url.endsWith('1') ? statuses.shift() : 200
      return status === undefined
        ? okTransport(request)
        : { status, etag: status === 200 ? '"etag"' : null }
    }

    await expect(
      uploadVideoParts({
        file: FILE,
        session: SESSION,
        onProgress: vi.fn(),
        transport,
        wait: instantWait,
      }),
    ).resolves.toHaveLength(3)
  })

  it('Given a part that always fails with 500, should stop after the attempt limit as interrupted', async () => {
    const transport = vi.fn<PartTransport>().mockResolvedValue({ status: 500, etag: null })

    const failure = await uploadVideoParts({
      file: FILE,
      session: { ...SESSION, parts: SESSION.parts.slice(0, 1) },
      onProgress: vi.fn(),
      transport,
      wait: instantWait,
    }).catch((error: unknown) => error)

    expect(transport).toHaveBeenCalledTimes(PART_ATTEMPTS)
    expect(failure).toBeInstanceOf(PostsApiError)
    expect(failure).toMatchObject({ status: 500, reason: 'interrupted' })
  })

  it('Given a 403 response, should fail as interrupted without retrying', async () => {
    const transport = vi.fn<PartTransport>().mockResolvedValue({ status: 403, etag: null })

    const failure = await uploadVideoParts({
      file: FILE,
      session: { ...SESSION, parts: SESSION.parts.slice(0, 1) },
      onProgress: vi.fn(),
      transport,
      wait: instantWait,
    }).catch((error: unknown) => error)

    expect(transport).toHaveBeenCalledTimes(1)
    expect(failure).toMatchObject({ status: 403, reason: 'interrupted' })
  })

  it('Given an OK response without an ETag, should fail as storageCors', async () => {
    const transport: PartTransport = async () => ({ status: 200, etag: null })

    const failure = await uploadVideoParts({
      file: FILE,
      session: { ...SESSION, parts: SESSION.parts.slice(0, 1) },
      onProgress: vi.fn(),
      transport,
      wait: instantWait,
    }).catch((error: unknown) => error)

    expect(failure).toMatchObject({ status: 0, reason: 'storageCors' })
  })

  it('Given the browser is offline, should wait for the online event before sending', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const transport = vi.fn<PartTransport>(okTransport)

    const upload = uploadVideoParts({
      file: FILE,
      session: { ...SESSION, parts: SESSION.parts.slice(0, 1) },
      onProgress: vi.fn(),
      transport,
      wait: instantWait,
    })
    await Promise.resolve()
    expect(transport).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('online'))
    await upload

    expect(transport).toHaveBeenCalledTimes(1)
  })
})

describe('uploadVideoDirect', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given a part that is rejected, should abort the upload and rethrow', async () => {
    const calls: string[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      calls.push(`${init?.method} ${String(input)}`)
      if (init?.method === 'POST') {
        return Response.json(SESSION, { status: 201 })
      }
      return new Response(null, { status: 204 })
    })
    class RejectingXhr {
      status = 0
      upload = {}
      onload: () => void = () => undefined
      open = vi.fn()
      getResponseHeader = () => null
      send = () => {
        this.status = 403
        this.onload()
      }
    }
    vi.stubGlobal('XMLHttpRequest', RejectingXhr)

    const failure = await uploadVideoDirect(FILE, 'video/mp4', vi.fn()).catch(
      (error: unknown) => error,
    )
    vi.unstubAllGlobals()

    expect(failure).toMatchObject({ status: 403, reason: 'interrupted' })
    expect(calls.at(-1)).toMatch(new RegExp(`^DELETE .*/admin/uploads/video/${SESSION.id}$`))
  })
})
