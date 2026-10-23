import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { PostMedia } from './post-media'

const createPost = (overrides: Partial<Models.Post> = {}): Models.Post => ({
  id: 'AbCdEfGh12',
  type: 'photo',
  status: 'published',
  text: '::caption::',
  likes: 0,
  publishedAt: '2026-10-23T10:00:00.000Z',
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
  image: {
    id: '3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5f',
    width: 800,
    height: 1200,
    altText: '::alt-text::',
    variants: [{ name: 'w480', width: 480, height: 720 }],
  },
  ...overrides,
})

const createYoutube = (): Models.Post =>
  createPost({
    id: 'Youtube123',
    type: 'youtube',
    image: null,
    text: '::youtube-caption::',
    youtube: {
      videoId: 'abcdefghijk',
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
      thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    },
  })

const createVideo = (): Models.Post =>
  createPost({
    id: 'Video12345',
    type: 'video',
    text: '::video-caption::',
    video: {
      id: '3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5a',
      width: 1080,
      height: 1920,
      contentType: 'video/mp4',
    },
  })

const renderMedia = (post: Models.Post) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PostMedia post={post} />
    </I18nProvider>,
  )

const renderPlayers = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PostMedia post={createVideo()} />
      <PostMedia post={createYoutube()} />
    </I18nProvider>,
  )

describe('PostMedia', () => {
  it('Given a portrait photo, should preserve dimensions and optimized choices', () => {
    const { container } = renderMedia(createPost())

    const image = screen.getByRole('img', { name: '::alt-text::' })
    expect(image).toHaveAttribute('width', '800')
    expect(image).toHaveAttribute('height', '1200')
    expect(image).toHaveClass('h-auto', 'w-full')
    expect(container.querySelector('source')).toHaveAttribute(
      'srcset',
      '/api/media/3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5f?variant=w480 480w, /api/media/3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5f 800w',
    )
  })

  it('Given an uploaded video, should defer downloading and show its poster', () => {
    renderMedia(createVideo())

    const video = screen.getByLabelText('::video-caption::')
    expect(video).toHaveAttribute('preload', 'none')
    expect(video).toHaveAttribute('poster', '/api/media/3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5f')
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('width', '1080')
    expect(video).toHaveAttribute('height', '1920')
  })

  it('Given YouTube, should require a click before embedding playback', async () => {
    const user = userEvent.setup()
    renderMedia(createYoutube())

    expect(screen.queryByTitle('::youtube-caption::')).not.toBeInTheDocument()
    expect(screen.getByText('Playing this video connects to YouTube.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Play video' }))

    expect(screen.getByTitle('::youtube-caption::')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0',
    )
    expect(screen.queryByRole('button', { name: 'Play video' })).not.toBeInTheDocument()
  })

  it('Given a playing YouTube embed, should stop it when uploaded video starts', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    renderPlayers()
    await user.click(screen.getByRole('button', { name: 'Play video' }))
    expect(screen.getByTitle('::youtube-caption::')).toBeVisible()

    await act(() =>
      screen
        .getByLabelText('::video-caption::')
        .dispatchEvent(new Event('play', { bubbles: true })),
    )

    expect(screen.queryByTitle('::youtube-caption::')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play video' })).toBeVisible()
  })

  it('Given uploaded playback, should pause it before starting YouTube', async () => {
    const user = userEvent.setup()
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    renderPlayers()
    await act(() =>
      screen
        .getByLabelText('::video-caption::')
        .dispatchEvent(new Event('play', { bubbles: true })),
    )

    await user.click(screen.getByRole('button', { name: 'Play video' }))

    expect(pause).toHaveBeenCalledTimes(1)
    expect(screen.getByTitle('::youtube-caption::')).toBeVisible()
  })
})
