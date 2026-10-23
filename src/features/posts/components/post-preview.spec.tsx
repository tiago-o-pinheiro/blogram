import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { PostPreview } from './post-preview'

const IMAGE_ID = '3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5f'

const POST: Models.Post = {
  id: 'AbCdEfGhIj',
  type: 'photo',
  status: 'draft',
  text: 'Sunrise over the hills',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
  image: {
    id: IMAGE_ID,
    width: 2000,
    height: 1000,
    altText: 'Hills at dawn',
    variants: [
      { name: 'w480', width: 480, height: 240 },
      { name: 'w960', width: 960, height: 480 },
    ],
  },
}

const renderPreview = (post: Models.Post, locale: 'en' | 'es' = 'en') =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <PostPreview post={post} />
    </I18nProvider>,
  )

describe('PostPreview', () => {
  it('Given an uploaded video, should preview with controls and poster', () => {
    const { container } = renderPreview({
      ...POST,
      type: 'video',
      video: {
        id: '3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5a',
        width: 1080,
        height: 1920,
        contentType: 'video/mp4',
      },
    })

    expect(container.querySelector('video')).toHaveAttribute('controls')
    expect(container.querySelector('video')).toHaveAttribute('preload', 'metadata')
    expect(container.querySelector('video')).toHaveAttribute('poster', `/api/media/${IMAGE_ID}`)
  })

  it('Given YouTube, should show a privacy enhanced embed', () => {
    renderPreview({
      ...POST,
      type: 'youtube',
      image: null,
      youtube: {
        videoId: 'abcdefghijk',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
        thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
      },
    })

    expect(screen.getByTitle('YouTube video preview')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/abcdefghijk',
    )
  })

  it('Given news, should identify the original source and destination', () => {
    renderPreview({
      ...POST,
      type: 'news',
      image: null,
      link: {
        url: 'https://example.test/article',
        title: '::title::',
        description: '::description::',
        source: '::source::',
      },
    })

    expect(screen.getByText('News')).toBeVisible()
    expect(screen.getByText('::source::')).toBeVisible()
    expect(screen.getByRole('link', { name: '::title::' })).toHaveAttribute(
      'href',
      'https://example.test/article',
    )
  })

  it('Given a post with variants, should render srcSet, dimensions and alt text', () => {
    renderPreview(POST)

    const image = screen.getByRole('img', { name: 'Hills at dawn' })
    expect(image).toHaveAttribute(
      'srcset',
      `/api/media/${IMAGE_ID}?variant=w480 480w, /api/media/${IMAGE_ID}?variant=w960 960w`,
    )
    expect(image).toHaveAttribute('src', `/api/media/${IMAGE_ID}`)
    expect(image).toHaveAttribute('width', '2000')
    expect(image).toHaveAttribute('height', '1000')
  })

  it('Given a draft, should show the Draft badge and the text', () => {
    renderPreview(POST)

    expect(screen.getByText('Draft')).toBeVisible()
    expect(screen.getByText('Sunrise over the hills')).toBeVisible()
  })

  it('Given a published post, should show the Published badge', () => {
    renderPreview({ ...POST, status: 'published', publishedAt: '2026-10-23T11:00:00.000Z' })

    expect(screen.getByText('Published')).toBeVisible()
  })

  it('Given a post without image or text, should show the fallbacks', () => {
    renderPreview({ ...POST, text: '', image: null })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('This post has no image.')).toBeVisible()
    expect(screen.getByText('No text.')).toBeVisible()
  })

  it('Given the es locale, should translate the badge', () => {
    renderPreview(POST, 'es')

    expect(screen.getByText('Borrador')).toBeVisible()
  })
})
