import { render, screen } from '@testing-library/react'
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

class SucceedingXhr {
  status = 200
  upload: { onprogress: ((event: { loaded: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  open() {}
  send() {
    this.upload.onprogress?.({ loaded: 9 })
    this.onload?.()
  }
  getResponseHeader() {
    return '"etag-1"'
  }
  abort() {}
}

const toForm = () => (
  <I18nProvider locale="en" messages={getMessages('en')}>
    <PostForm
      videoUploadMode="direct"
      maxImageBytes={Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES}
      maxVideoBytes={20 * 1024 ** 2}
    />
  </I18nProvider>
)

const getFileInput = (label: string) =>
  screen.getByLabelText(label, { selector: 'input[type="file"]' })

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

describe('PostForm direct video upload after a rejected create', () => {
  it('BH-2: Given a finished upload and a rejected post create, should abort the upload and show the error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('XMLHttpRequest', SucceedingXhr)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(SESSION))
      .mockResolvedValueOnce(json(READY))
      .mockResolvedValueOnce(json({ message: 'Invalid' }, 422))
      .mockResolvedValue(new Response(null, { status: 204 }))
    render(toForm())

    await user.click(screen.getByRole('radio', { name: 'Video' }))
    await user.upload(
      getFileInput('Video file'),
      new File(['::video::'], 'video.mp4', { type: 'video/mp4' }),
    )
    await user.upload(getFileInput('Video poster'), new File(['a'], 'a.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByRole('alert')).toBeVisible()
    const abortCall = fetchSpy.mock.calls.find(
      ([input, init]) =>
        urlOf(input) === `/api/admin/uploads/video/${UPLOAD_ID}` && init?.method === 'DELETE',
    )
    expect(abortCall).toBeDefined()
  })
})
