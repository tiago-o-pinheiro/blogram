import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { PostForm } from './post-form'

const refresh = vi.fn()
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
}))

const UPLOAD_ID = '5d6e7f80-1a2b-4c3d-8e4f-5a6b7c8d9e0f'
const PART_URL = 'https://bucket.test/part-1?signature=abc'

const SESSION: Models.VideoUploadSession = {
  id: UPLOAD_ID,
  partSize: Models.VIDEO_UPLOAD_PART_BYTES,
  parts: [{ partNumber: 1, url: PART_URL }],
  expiresAt: '2026-10-26T10:00:00.000Z',
}

const READY: Models.VideoUploadReady = {
  id: UPLOAD_ID,
  contentType: 'video/mp4',
  size: 9,
  width: 1080,
  height: 1920,
}

const VIDEO_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

const SAVED_POST: Models.Post = {
  id: 'AbCdEfGh12',
  type: 'video',
  status: 'draft',
  text: '',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  image: null,
  video: { id: VIDEO_ID, width: 1080, height: 1920, contentType: 'video/mp4' },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

type PartOutcome = 'success' | 'network-error' | 'hold'

const stubXhr = (outcome: PartOutcome) => {
  const requests: { method: string; url: string }[] = []
  class FakeXhr {
    status = 200
    upload: { onprogress: ((event: { loaded: number }) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    method = ''
    url = ''
    open(method: string, url: string) {
      this.method = method
      this.url = url
    }
    send() {
      requests.push({ method: this.method, url: this.url })
      this.upload.onprogress?.({ loaded: 4 })
      if (outcome === 'success') {
        this.onload?.()
      }
      if (outcome === 'network-error') {
        this.onerror?.()
      }
    }
    getResponseHeader() {
      return '"etag-1"'
    }
    abort() {}
  }
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  return requests
}

const toForm = (post?: Models.Post, videoUploadMode: Models.VideoUploadMode = 'direct') => (
  <I18nProvider locale="en" messages={getMessages('en')}>
    <PostForm
      post={post}
      videoUploadMode={videoUploadMode}
      maxImageBytes={Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES}
      maxVideoBytes={20 * 1024 ** 2}
    />
  </I18nProvider>
)

const mp4File = () => new File(['::video::'], 'video.mp4', { type: 'video/mp4' })
const pngFile = () => new File(['a'], 'a.png', { type: 'image/png' })

const getFileInput = (label: string) =>
  screen.getByLabelText(label, { selector: 'input[type="file"]' })

const selectVideoAndPoster = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('radio', { name: 'Video' }))
  await user.upload(getFileInput('Video file'), mp4File())
  await user.upload(getFileInput('Video poster'), pngFile())
}

const urlOf = (input: Parameters<typeof fetch>[0] | undefined) =>
  typeof input === 'string' ? input : ''

beforeEach(() => {
  refresh.mockReset()
  push.mockReset()
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:one'), revokeObjectURL: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PostForm direct video upload', () => {
  it('Given a held part upload, should show the progress bar and uploading label', async () => {
    const user = userEvent.setup()
    stubXhr('hold')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(SESSION))
    render(toForm())

    await selectVideoAndPoster(user)
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByRole('progressbar', { name: 'Uploading video' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Photo' })).toBeDisabled()
  })

  it('Given a finished upload, should create the post with the upload id and no file', async () => {
    const user = userEvent.setup()
    const requests = stubXhr('success')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(SESSION))
      .mockResolvedValueOnce(json(READY))
      .mockResolvedValueOnce(json(SAVED_POST))
    render(toForm())

    await selectVideoAndPoster(user)
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/posts/AbCdEfGh12'))
    expect(requests).toEqual([{ method: 'PUT', url: PART_URL }])
    const body = fetchSpy.mock.calls[2]?.[1]?.body
    expect(body).toBeInstanceOf(FormData)
    if (!(body instanceof FormData)) {
      return
    }
    expect(body.get('videoUploadId')).toBe(UPLOAD_ID)
    expect(body.get('file')).toBeNull()
    expect(body.get('poster')).toBeInstanceOf(File)
  })

  it('Given a saved video, should replace it from the finished upload', async () => {
    const user = userEvent.setup()
    stubXhr('success')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(SESSION))
      .mockResolvedValueOnce(json(READY))
      .mockResolvedValueOnce(json(SAVED_POST))
    render(toForm(SAVED_POST))

    await user.upload(getFileInput('Video file'), mp4File())

    expect(await screen.findByText('Video replaced.')).toBeVisible()
    const replaceCall = fetchSpy.mock.calls[2]
    expect(urlOf(replaceCall?.[0])).toBe('/api/admin/posts/AbCdEfGh12/video')
    expect(replaceCall?.[1]?.method).toBe('PUT')
    expect(replaceCall?.[1]?.body).toBe(JSON.stringify({ uploadId: UPLOAD_ID }))
  })

  it('Given a network failure on every part, should show the interrupted message', async () => {
    const user = userEvent.setup()
    stubXhr('network-error')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(SESSION))
      .mockResolvedValue(new Response(null, { status: 204 }))
    const realSetTimeout = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay, ...args) =>
      realSetTimeout(
        callback,
        delay !== undefined && delay >= 2000 && delay <= 8000 ? 0 : delay,
        ...args,
      ),
    )
    render(toForm())

    await selectVideoAndPoster(user)
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByRole('alert', {}, { timeout: 10000 })).toHaveTextContent(
      getMessages('en')['posts.error.interrupted'],
    )
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('Given form mode, should still send the video file in the post request', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(SAVED_POST))
    render(toForm(undefined, 'form'))

    await selectVideoAndPoster(user)
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(body instanceof FormData && body.get('file')).toBeInstanceOf(File)
  })
})
