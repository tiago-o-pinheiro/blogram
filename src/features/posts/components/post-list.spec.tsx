import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { PostList } from './post-list'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const IMAGE: Models.PostImage = {
  id: '3f0c6f0e-6f7e-4e0b-8f3e-0a1b2c3d4e5f',
  width: 1600,
  height: 1200,
  altText: 'A hill',
  variants: [{ name: 'w480', width: 480, height: 360 }],
}

const POST: Models.Post = {
  id: 'AbCdEfGhIj',
  type: 'photo',
  status: 'published',
  text: 'Hello',
  likes: 7,
  publishedAt: '2026-10-22T10:00:00.000Z',
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-22T10:00:00.000Z',
  image: IMAGE,
}

const DRAFT: Models.Post = {
  ...POST,
  id: 'ZyXwVuTsRq',
  status: 'draft',
  publishedAt: null,
  likes: 0,
  image: null,
}

const renderList = (page: Models.PostPage, locale: 'en' | 'es' = 'en') =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <PostList page={page} />
    </I18nProvider>,
  )

beforeEach(() => {
  refresh.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PostList', () => {
  it('Given posts, should show type, status, date, likes and actions per row', () => {
    renderList({ data: [POST, DRAFT], meta: { total: 2, page: 1, pageSize: 20 } })

    const [publishedRow, draftRow] = screen.getAllByRole('listitem')
    if (!publishedRow || !draftRow) {
      throw new Error('Expected two rows')
    }
    const published = within(publishedRow)
    expect(published.getByText('Photo')).toBeVisible()
    expect(published.getByText('Published')).toBeVisible()
    expect(published.getByText('2026-10-22')).toBeVisible()
    expect(published.getByText('7 likes')).toBeVisible()
    expect(published.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/admin/posts/AbCdEfGhIj',
    )
    expect(published.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/posts/AbCdEfGhIj',
    )
    expect(published.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
    expect(within(draftRow).getByText('Draft')).toBeVisible()
    expect(within(draftRow).getByRole('button', { name: 'Publish' })).toBeEnabled()
    expect(within(draftRow).getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it('Given a post with an image, should use the w480 variant as its thumbnail', () => {
    renderList({ data: [POST], meta: { total: 1, page: 1, pageSize: 20 } })

    expect(screen.getByRole('img')).toHaveAttribute('src', `/api/media/${IMAGE.id}?variant=w480`)
  })

  it('Given a draft, should publish it from the list and refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ ...DRAFT, status: 'published' }))
    renderList({ data: [DRAFT], meta: { total: 1, page: 1, pageSize: 20 } })

    await user.click(screen.getByRole('button', { name: 'Publish' }))

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe('/api/admin/posts/ZyXwVuTsRq/status')
    expect(JSON.parse(String(init?.body))).toEqual({ status: 'published' })
  })

  it('Given a status filter, should mark it as the current filter', () => {
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <PostList
          page={{ data: [DRAFT], meta: { total: 1, page: 1, pageSize: 20 } }}
          status="draft"
        />
      </I18nProvider>,
    )

    const filters = within(screen.getByRole('navigation', { name: 'Filter posts' }))
    expect(filters.getByRole('link', { name: 'Drafts' })).toHaveAttribute('aria-current', 'page')
    expect(filters.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current')
  })

  it('Given no posts, should show the empty state with a create link', () => {
    renderList({ data: [], meta: { total: 0, page: 1, pageSize: 20 } })

    expect(screen.getByText('No posts yet. Create your first one.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'New post' })).toHaveAttribute(
      'href',
      '/admin/posts/new',
    )
  })

  it('Given a middle page, should link to the previous and next pages', () => {
    renderList({ data: [POST], meta: { total: 60, page: 2, pageSize: 20 } })

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '?page=1')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '?page=3')
    expect(screen.getByText('Page 2 of 3')).toBeVisible()
  })

  it('Given a single page, should not show previous or next links', () => {
    renderList({ data: [POST], meta: { total: 1, page: 1, pageSize: 20 } })

    expect(screen.queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('Given the es locale, should translate the labels', () => {
    renderList({ data: [POST], meta: { total: 1, page: 1, pageSize: 20 } }, 'es')

    expect(screen.getByText('Publicado')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Editar' })).toBeVisible()
  })

  it('BH-3: Given an image narrower than 480px (server stores no variants), should not request a variant the media route answers 404 for', () => {
    const smallImage: Models.PostImage = { ...IMAGE, width: 400, height: 300, variants: [] }
    renderList({
      data: [{ ...POST, image: smallImage }],
      meta: { total: 1, page: 1, pageSize: 20 },
    })

    const src = screen.getByRole('img').getAttribute('src') ?? ''
    const variant = new URLSearchParams(src.split('?')[1]).get('variant')
    expect([null, 'full', ...smallImage.variants.map((v) => v.name)]).toContain(variant)
  })

  it('BH-4: Given a page past the last post (e.g. after deleting the only post on page 2), should not claim there are no posts and should link back', () => {
    renderList({ data: [], meta: { total: 20, page: 2, pageSize: 20 } })

    expect(screen.queryByText('No posts yet. Create your first one.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Previous' })).toBeVisible()
  })
})
