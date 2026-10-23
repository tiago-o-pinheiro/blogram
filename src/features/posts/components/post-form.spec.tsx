import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Post } from '@/models/models'

import { PostForm } from './post-form'

const refresh = vi.fn()
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
}))

const POST: Post = {
  id: 'AbCdEfGh12',
  type: 'photo',
  status: 'draft',
  text: 'Sunrise',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  image: {
    id: '3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f',
    width: 1600,
    height: 900,
    altText: 'A sunrise',
    variants: [{ name: 'w960', width: 960, height: 540 }],
  },
}

const renderForm = (post?: Post) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PostForm post={post} />
    </I18nProvider>,
  )

const createObjectURL = vi.fn()
const revokeObjectURL = vi.fn()

const pngFile = () => new File(['a'], 'a.png', { type: 'image/png' })

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
  it('Given YouTube selected, should show its URL without uploads', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText('Post type'), 'youtube')

    expect(screen.getByLabelText('YouTube URL')).toBeVisible()
    expect(screen.queryByLabelText('Photo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Alt text')).not.toBeInTheDocument()
  })

  it('Given a video and poster, should submit both files', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm()

    await user.selectOptions(screen.getByLabelText('Post type'), 'video')
    await user.upload(
      screen.getByLabelText('Video file'),
      new File(['::video::'], 'video.mp4', { type: 'video/mp4' }),
    )
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled()
    await user.upload(screen.getByLabelText('Video poster'), pngFile())
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(body).toBeInstanceOf(FormData)
    expect(body instanceof FormData && body.get('file')).toBeInstanceOf(File)
    expect(body instanceof FormData && body.get('poster')).toBeInstanceOf(File)
    expect(body instanceof FormData && body.get('type')).toBe('video')
  })

  it.each(['link', 'news'])(
    'Given %s metadata fails, should allow manual publication',
    async (type) => {
      const user = userEvent.setup()
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(null, { status: 422 }))
        .mockResolvedValueOnce(Response.json(POST))
      renderForm()

      await user.selectOptions(screen.getByLabelText('Post type'), type)
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
      const body = fetchSpy.mock.calls[1]?.[1]?.body
      expect(body instanceof FormData && body.get('type')).toBe(type)
      expect(body instanceof FormData && body.get('title')).toBe('::title::')
      expect(body instanceof FormData && body.get('file')).toBeNull()
    },
  )

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

    await user.selectOptions(screen.getByLabelText('Post type'), 'link')
    await user.type(screen.getByLabelText('Destination URL'), 'https://example.test/article')
    await user.type(screen.getByLabelText('Title'), '::manual-title::')
    await user.click(screen.getByRole('button', { name: 'Get link preview' }))

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Description')).toHaveValue('::description::'),
    )
    expect(screen.getByLabelText('Title')).toHaveValue('::manual-title::')
  })

  it('Given a new post, should offer types and photo fields', () => {
    renderForm()

    expect(screen.getByLabelText('Photo')).toBeVisible()
    expect(screen.getByLabelText('Alt text')).toBeVisible()
    expect(screen.getByLabelText('Caption')).toBeVisible()
    expect(screen.getByLabelText('Post type')).toBeVisible()
    expect(screen.getAllByRole('option')).toHaveLength(5)
  })

  it('Given no file, should disable creating and explain alt text', () => {
    renderForm()

    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled()
    expect(screen.getByText(/Describe the image/)).toBeVisible()
  })

  it('Given a chosen image, should preview it locally', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.upload(screen.getByLabelText('Photo'), pngFile())

    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:one')
  })

  it('Given a file that is not an accepted image, should show an alert and no preview', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderForm()

    await user.upload(
      screen.getByLabelText('Photo'),
      new File(['t'], 't.txt', { type: 'text/plain' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('Given a valid submit, should post the multipart payload with alt text and open the new post', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm()

    await user.upload(screen.getByLabelText('Photo'), pngFile())
    await user.type(screen.getByLabelText('Alt text'), 'A sunrise')
    await user.type(screen.getByLabelText('Caption'), 'Sunrise')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/admin/posts/AbCdEfGh12'))
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('/api/admin/posts')
    const body = init?.body
    expect(body).toBeInstanceOf(FormData)
    if (body instanceof FormData) {
      expect(body.get('altText')).toBe('A sunrise')
      expect(body.get('text')).toBe('Sunrise')
      expect(body.get('type')).toBe('photo')
    }
  })

  it('Given a rejected upload, should show the translated error and not navigate', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 413 }))
    renderForm()

    await user.upload(screen.getByLabelText('Photo'), pngFile())
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That file is too large.')
    expect(push).not.toHaveBeenCalled()
  })

  it('Given a pending submit, should disable the fields and the button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderForm()

    await user.upload(screen.getByLabelText('Photo'), pngFile())
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    expect(await screen.findByRole('button', { name: /Create draft/ })).toBeDisabled()
    expect(screen.getByLabelText('Alt text')).toBeDisabled()
  })
})

describe('PostForm edit', () => {
  it('Given an edited video, should replace its uploaded file', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ ...POST, type: 'video' }))
    renderForm({ ...POST, type: 'video' })

    await user.upload(
      screen.getByLabelText('Video file'),
      new File(['::video::'], 'replacement.webm', { type: 'video/webm' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Video replaced.')
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/admin/posts/AbCdEfGh12/video')
    expect(fetchSpy.mock.calls[0]?.[1]?.method).toBe('PUT')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('Given a post, should prefill text and alt text and show the stored image', () => {
    renderForm(POST)

    expect(screen.getByLabelText('Alt text')).toHaveValue('A sunrise')
    expect(screen.getByLabelText('Caption')).toHaveValue('Sunrise')
    expect(screen.getByRole('img', { name: 'A sunrise' })).toHaveAttribute(
      'src',
      '/api/media/3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f?variant=w960',
    )
    expect(screen.queryByLabelText('Photo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('New image')).not.toBeInTheDocument()
  })

  it('Given Save changes, should persist text and alt text then refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm(POST)

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

  it('Given Replace image and a file, should call the image endpoint and refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(POST))
    renderForm(POST)

    await user.click(screen.getByRole('button', { name: 'Replace image' }))
    await user.upload(screen.getByLabelText('New image'), pngFile())

    expect(await screen.findByRole('status')).toHaveTextContent('Image replaced.')
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('/api/admin/posts/AbCdEfGh12/image')
    expect(init?.method).toBe('PUT')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('Given a failed save, should show the translated error', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))
    renderForm(POST)

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session expired.')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('BH-3: Given a stored image narrower than 960px (no w960 variant), should not preview a variant the media route answers 404 for', () => {
    const image: NonNullable<Post['image']> = {
      id: '3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f',
      width: 700,
      height: 400,
      altText: 'A sunrise',
      variants: [{ name: 'w480', width: 480, height: 274 }],
    }
    renderForm({ ...POST, image })

    const src = screen.getByRole('img', { name: 'A sunrise' }).getAttribute('src') ?? ''
    const variant = new URLSearchParams(src.split('?')[1]).get('variant')
    expect([null, 'full', ...image.variants.map((v) => v.name)]).toContain(variant)
  })
})
