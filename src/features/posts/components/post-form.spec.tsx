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

const IMAGE: NonNullable<Models.Post['image']> = {
  id: '3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f',
  width: 1600,
  height: 900,
  altText: 'A sunrise',
  variants: [{ name: 'w960', width: 960, height: 540 }],
}

const VIDEO: NonNullable<Models.Post['video']> = {
  id: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  width: 1080,
  height: 1920,
  contentType: 'video/mp4',
}

const REFRESHED_IMAGE_ID = '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

const REFRESHED_VIDEO_ID = '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f'

const POST: Models.Post = {
  id: 'AbCdEfGh12',
  type: 'photo',
  status: 'draft',
  text: 'Sunrise',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  image: IMAGE,
}

const VIDEO_POST: Models.Post = { ...POST, type: 'video', video: VIDEO }

const REFRESHED_IMAGE_POST: Models.Post = { ...POST, image: { ...IMAGE, id: REFRESHED_IMAGE_ID } }

const REFRESHED_VIDEO_POST: Models.Post = {
  ...VIDEO_POST,
  video: { ...VIDEO, id: REFRESHED_VIDEO_ID },
}

const LINK_POST: Models.Post = {
  ...POST,
  type: 'link',
  link: {
    url: 'https://example.test/article',
    title: '::title::',
    description: '::description::',
    source: '::source::',
  },
}

const MAX_VIDEO_BYTES = 20 * 1024 ** 2

type RenderOptions = { post?: Models.Post }

const toForm = (post?: Models.Post) => (
  <I18nProvider locale="en" messages={getMessages('en')}>
    <PostForm
      post={post}
      maxImageBytes={Models.DEFAULT_UPLOAD_MAX_IMAGE_BYTES}
      maxVideoBytes={MAX_VIDEO_BYTES}
    />
  </I18nProvider>
)

const renderForm = ({ post }: RenderOptions = {}) => render(toForm(post))

const createObjectURL = vi.fn()
const revokeObjectURL = vi.fn()

const pngFile = () => new File(['a'], 'a.png', { type: 'image/png' })

const textFile = () => new File(['t'], 't.txt', { type: 'text/plain' })

const mp4File = (name: string) => new File(['::video::'], name, { type: 'video/mp4' })

const toOversizeFile = (file: File, size: number) => {
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const getFileInput = (label: string) =>
  screen.getByLabelText(label, { selector: 'input[type="file"]' })

const readBody = (fetchSpy: { mock: { calls: Parameters<typeof fetch>[] } }, call = 0) => {
  const body = fetchSpy.mock.calls[call]?.[1]?.body
  if (!(body instanceof FormData)) {
    throw new Error('Expected a multipart body')
  }
  return body
}

beforeEach(() => {
  refresh.mockReset()
  push.mockReset()
  createObjectURL.mockReset().mockReturnValue('blob:one')
  revokeObjectURL.mockReset()
  Object.assign(URL, { createObjectURL, revokeObjectURL })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PostForm create', () => {
  it('BH-6: Given another link URL, should replace previous automatic metadata', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          url: 'https://first.test/article',
          title: '::first-title::',
          description: '::first-description::',
          source: '::first-source::',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          url: 'https://second.test/article',
          title: '::second-title::',
          description: '::second-description::',
          source: '::second-source::',
        }),
      )
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Link' }))
    await user.type(screen.getByLabelText('Destination URL'), 'https://first.test/article')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))
    await vi.waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('::first-title::'))
    await user.clear(screen.getByLabelText('Destination URL'))
    await user.type(screen.getByLabelText('Destination URL'), 'https://second.test/article')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))

    await vi.waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('::second-title::'))
    expect(screen.getByLabelText('Description')).toHaveValue('::second-description::')
    expect(screen.getByLabelText('Original source')).toHaveValue('::second-source::')
  })

  it('BH-6: Given edited automatic title, should preserve it across URLs', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          url: 'https://first.test/article',
          title: '::first-title::',
          description: '::first-description::',
          source: '::first-source::',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          url: 'https://second.test/article',
          title: '::second-title::',
          description: '::second-description::',
          source: '::second-source::',
        }),
      )
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Link' }))
    await user.type(screen.getByLabelText('Destination URL'), 'https://first.test/article')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))
    await vi.waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('::first-title::'))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), '::manual-title::')
    await user.clear(screen.getByLabelText('Destination URL'))
    await user.type(screen.getByLabelText('Destination URL'), 'https://second.test/article')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Description')).toHaveValue('::second-description::'),
    )
    expect(screen.getByLabelText('Title')).toHaveValue('::manual-title::')
    expect(screen.getByLabelText('Original source')).toHaveValue('::second-source::')
  })

  it('BH-6: Given deliberately cleared description, should keep it empty', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          url: 'https://first.test/article',
          title: '::first-title::',
          description: '::first-description::',
          source: '::first-source::',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          url: 'https://second.test/article',
          title: '::second-title::',
          description: '::second-description::',
          source: '::second-source::',
        }),
      )
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Link' }))
    await user.type(screen.getByLabelText('Destination URL'), 'https://first.test/article')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))
    await vi.waitFor(() =>
      expect(screen.getByLabelText('Description')).toHaveValue('::first-description::'),
    )
    await user.clear(screen.getByLabelText('Description'))
    await user.clear(screen.getByLabelText('Destination URL'))
    await user.type(screen.getByLabelText('Destination URL'), 'https://second.test/article')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))

    await vi.waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('::second-title::'))
    expect(screen.getByLabelText('Description')).toHaveValue('')
  })

  it('Given YouTube selected, should show its URL without uploads', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'YouTube' }))

    expect(screen.getByLabelText('YouTube URL')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Choose photo' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Alt text')).not.toBeInTheDocument()
  })

  it('Given a video and poster, should submit both files', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Video' }))
    expect(getFileInput('Video file')).toHaveAttribute('name', 'file')
    expect(getFileInput('Video poster')).toHaveAttribute('name', 'poster')
    await user.upload(getFileInput('Video file'), mp4File('video.mp4'))
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled()
    await user.upload(getFileInput('Video poster'), pngFile())
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/admin/posts')
    expect(readBody(fetchSpy).get('file')).toBeInstanceOf(File)
    expect(readBody(fetchSpy).get('poster')).toBeInstanceOf(File)
    expect(readBody(fetchSpy).get('type')).toBe('video')
  })

  it('Given a video over the video limit, should reject it and keep creating disabled', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Video' }))
    await user.upload(
      getFileInput('Video file'),
      toOversizeFile(mp4File('big.mp4'), MAX_VIDEO_BYTES * 2),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'big.mp4 is 40 MB. The limit is 20 MB, so choose a smaller file.',
    )
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled()
  })

  it.each([
    ['link', 'Link'],
    ['news', 'News'],
  ])('Given %s metadata fails, should allow manual publication', async (type, name) => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 422 }))
      .mockResolvedValueOnce(Response.json(POST))
    renderForm()

    await user.click(screen.getByRole('radio', { name }))
    await user.type(screen.getByLabelText('Destination URL'), 'https://example.test/article')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'You can fill in the fields and publish anyway.',
    )
    await user.type(screen.getByLabelText('Title'), '::title::')
    await user.type(screen.getByLabelText('Description'), '::description::')
    await user.type(screen.getByLabelText('Original source'), '::source::')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    expect(readBody(fetchSpy, 1).get('type')).toBe(type)
    expect(readBody(fetchSpy, 1).get('title')).toBe('::title::')
    expect(readBody(fetchSpy, 1).get('file')).toBeNull()
  })

  it('Given a link cover, should send it as the post file', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Link' }))
    expect(getFileInput('Cover image (optional)')).toHaveAttribute('name', 'poster')
    await user.upload(getFileInput('Cover image (optional)'), pngFile())
    await user.type(screen.getByLabelText('Destination URL'), 'https://example.test/article')
    await user.type(screen.getByLabelText('Title'), '::title::')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    expect(readBody(fetchSpy).get('file')).toBeInstanceOf(File)
    expect(readBody(fetchSpy).get('poster')).toBeNull()
  })

  it('Given successful metadata, should preserve manually entered text', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        url: 'https://example.test/article',
        title: '::fetched-title::',
        description: '::description::',
        source: '::source::',
      }),
    )
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Link' }))
    await user.type(screen.getByLabelText('Destination URL'), 'https://example.test/article')
    await user.type(screen.getByLabelText('Title'), '::manual-title::')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Description')).toHaveValue('::description::'),
    )
    expect(screen.getByLabelText('Title')).toHaveValue('::manual-title::')
  })

  it('Given a new post, should offer five types and photo fields', () => {
    renderForm()

    expect(screen.getByRole('radiogroup', { name: 'What are you posting?' })).toBeVisible()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('radio', { name: 'Photo' })).toBeChecked()
    expect(getFileInput('Photo')).toHaveAttribute('name', 'file')
    expect(screen.getByLabelText('Alt text')).toBeVisible()
    expect(screen.getByLabelText('Caption')).toBeVisible()
  })

  it('Given each type, should show the formats and limit its server accepts', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.getByText('JPEG')).toBeVisible()
    expect(screen.getByText('Up to 10 MB')).toBeVisible()
    await user.click(screen.getByRole('radio', { name: 'Video' }))

    expect(screen.getByText('MP4')).toBeVisible()
    expect(screen.getByText('Up to 20 MB')).toBeVisible()
    expect(screen.getByText('Vertical videos work too.')).toBeVisible()
  })

  it('Given no file, should disable creating and explain alt text', () => {
    renderForm()

    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled()
    expect(screen.getByText(/Describe the image/)).toBeVisible()
  })

  it('Given a chosen image, should preview it locally with its name', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.upload(getFileInput('Photo'), pngFile())

    expect(screen.getByRole('img', { name: 'Preview of the selected photo' })).toHaveAttribute(
      'src',
      'blob:one',
    )
    expect(screen.getByText('a.png')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeEnabled()
  })

  it('Given a file that is not an accepted image, should show an alert and no preview', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderForm()

    await user.upload(getFileInput('Photo'), textFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "t.txt can't be used. Accepted formats: JPEG, PNG or WebP.",
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled()
  })

  it('Given a rejected file, should clear the alert after switching type and back', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderForm()

    await user.upload(getFileInput('Photo'), textFile())
    expect(await screen.findByRole('alert')).toBeVisible()
    await user.click(screen.getByRole('radio', { name: 'Video' }))
    await user.click(screen.getByRole('radio', { name: 'Photo' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Given a chosen image, should revoke its preview when the type changes', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.upload(getFileInput('Photo'), pngFile())
    await user.click(screen.getByRole('radio', { name: 'Video' }))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled()
  })

  it('Given a chosen image, should revoke its preview when the form closes', async () => {
    const user = userEvent.setup()
    const { unmount } = renderForm()

    await user.upload(getFileInput('Photo'), pngFile())
    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
  })

  it('Given a valid submit, should post the multipart payload with alt text and open the new post', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm()

    await user.upload(getFileInput('Photo'), pngFile())
    await user.type(screen.getByLabelText('Alt text'), 'A sunrise')
    await user.type(screen.getByLabelText('Caption'), 'Sunrise')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/admin/posts/AbCdEfGh12'))
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/admin/posts')
    expect(readBody(fetchSpy).get('altText')).toBe('A sunrise')
    expect(readBody(fetchSpy).get('text')).toBe('Sunrise')
    expect(readBody(fetchSpy).get('type')).toBe('photo')
    expect(readBody(fetchSpy).get('file')).toBeInstanceOf(File)
  })

  it('Given a rejected upload, should show the translated error and not navigate', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 413 }))
    renderForm()

    await user.upload(getFileInput('Photo'), pngFile())
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That file is too large.')
    expect(push).not.toHaveBeenCalled()
  })

  it('Given a pending submit, should disable the fields and the button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderForm()

    await user.upload(getFileInput('Photo'), pngFile())
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    expect(await screen.findByRole('button', { name: /Create draft/ })).toBeDisabled()
    expect(screen.getByLabelText('Alt text')).toBeDisabled()
    expect(getFileInput('Photo')).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Video' })).toBeDisabled()
  })
})

describe('PostForm edit', () => {
  it('BH-7: Given committed replacement, should not offer ineffective Undo', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(REFRESHED_IMAGE_POST))
    renderForm({ post: POST })

    await user.upload(getFileInput('Photo'), pngFile())

    expect(await screen.findByRole('status')).toHaveTextContent('Image replaced.')
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('Given a saved video replacement, should use its server reference immediately', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(REFRESHED_VIDEO_POST))
    const { rerender } = renderForm({ post: VIDEO_POST })

    await user.upload(
      getFileInput('Video file'),
      new File(['::video::'], 'replacement.webm', { type: 'video/webm' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Video replaced.')
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/admin/posts/AbCdEfGh12/video')
    expect(fetchSpy.mock.calls[0]?.[1]?.method).toBe('PUT')
    expect(readBody(fetchSpy).get('file')).toBeInstanceOf(File)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('replacement.webm')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Video file', { selector: 'video' })).toHaveAttribute(
      'src',
      `/api/media/${REFRESHED_VIDEO_ID}`,
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')

    rerender(toForm(REFRESHED_VIDEO_POST))

    expect(screen.queryByText('replacement.webm')).not.toBeInTheDocument()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
  })

  it('Given a saved video, should retain it when its poster refreshes', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(REFRESHED_VIDEO_POST))
    const { rerender } = renderForm({ post: VIDEO_POST })

    await user.upload(
      getFileInput('Video file'),
      new File(['::video::'], 'replacement.webm', { type: 'video/webm' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Video replaced.')
    rerender(toForm({ ...VIDEO_POST, image: { ...IMAGE, id: REFRESHED_IMAGE_ID } }))

    expect(screen.getByLabelText('Video file', { selector: 'video' })).toHaveAttribute(
      'src',
      `/api/media/${REFRESHED_VIDEO_ID}`,
    )
  })

  it('Given an edited video poster, should replace the image through the image endpoint', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(VIDEO_POST))
    renderForm({ post: VIDEO_POST })

    await user.upload(getFileInput('Video poster'), pngFile())

    expect(await screen.findByRole('status')).toHaveTextContent('Image replaced.')
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/admin/posts/AbCdEfGh12/image')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('Given a post, should prefill text and alt text, show the stored image and hide the type picker', () => {
    renderForm({ post: POST })

    expect(screen.getByLabelText('Alt text')).toHaveValue('A sunrise')
    expect(screen.getByLabelText('Caption')).toHaveValue('Sunrise')
    expect(screen.getByRole('img', { name: 'A sunrise' })).toHaveAttribute(
      'src',
      '/api/media/3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f?variant=w960',
    )
    expect(screen.getByRole('button', { name: 'Replace' })).toBeVisible()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('Given Save changes, should persist text and alt text then refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm({ post: POST })

    await user.clear(screen.getByLabelText('Alt text'))
    await user.type(screen.getByLabelText('Alt text'), 'Dawn')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Changes saved.')
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('/api/admin/posts/AbCdEfGh12')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'Sunrise', altText: 'Dawn' })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('Given a new photo, should call the image endpoint, refresh and keep previewing the new photo', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(REFRESHED_IMAGE_POST))
    renderForm({ post: POST })

    await user.upload(getFileInput('Photo'), pngFile())

    expect(await screen.findByRole('status')).toHaveTextContent('Image replaced.')
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('/api/admin/posts/AbCdEfGh12/image')
    expect(init?.method).toBe('PUT')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('a.png')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'A sunrise' })).toHaveAttribute(
      'src',
      `/api/media/${REFRESHED_IMAGE_ID}?variant=w960`,
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
  })

  it('Given a replaced photo, should show the saved image once the refreshed post arrives', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    const { rerender } = renderForm({ post: POST })

    await user.upload(getFileInput('Photo'), pngFile())
    expect(await screen.findByRole('status')).toHaveTextContent('Image replaced.')
    rerender(toForm(REFRESHED_IMAGE_POST))

    expect(screen.queryByText('a.png')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'A sunrise' })).toHaveAttribute(
      'src',
      `/api/media/${REFRESHED_IMAGE_ID}?variant=w960`,
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one')
  })

  it('Given a new link cover, should replace the image through the image endpoint', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(LINK_POST))
    renderForm({ post: LINK_POST })

    await user.upload(getFileInput('Cover image (optional)'), pngFile())

    expect(await screen.findByRole('status')).toHaveTextContent('Image replaced.')
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/admin/posts/AbCdEfGh12/image')
  })

  it('Given a failed replacement, should show the translated error and drop the picked file', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 413 }))
    renderForm({ post: POST })

    await user.upload(getFileInput('Photo'), pngFile())

    expect(await screen.findByRole('alert')).toHaveTextContent('That file is too large.')
    expect(screen.queryByText('a.png')).not.toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('Given a failed save, should show the translated error', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))
    renderForm({ post: POST })

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session expired.')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('BH-3: Given a stored image narrower than 960px (no w960 variant), should not preview a variant the media route answers 404 for', () => {
    const image: NonNullable<Models.Post['image']> = {
      id: '3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f',
      width: 700,
      height: 400,
      altText: 'A sunrise',
      variants: [{ name: 'w480', width: 480, height: 274 }],
    }
    renderForm({ post: { ...POST, image } })

    const src = screen.getByRole('img', { name: 'A sunrise' }).getAttribute('src') ?? ''
    const variant = new URLSearchParams(src.split('?')[1]).get('variant')
    expect([null, 'full', ...image.variants.map((v) => v.name)]).toContain(variant)
  })
})
