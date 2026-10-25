import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { PublicFeed } from './public-feed'

const renderFeed = (page: Models.PostPage, filter: Models.FeedFilter = 'all', query?: string) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PublicFeed
        page={page}
        filter={filter}
        query={query}
        owner="::owner::"
        origin="https://example.test"
        locale="en"
        messages={getMessages('en')}
      />
    </I18nProvider>,
  )

describe('PublicFeed', () => {
  it('Given the video filter, should identify it and expose reproducible URLs', () => {
    renderFeed({ data: [], meta: { total: 0, page: 1, pageSize: 12 } }, 'video')

    const filters = within(screen.getByRole('navigation', { name: 'Filter posts' }))
    expect(filters.getByRole('link', { name: 'Videos' })).toHaveAttribute('aria-current', 'page')
    expect(filters.getByRole('link', { name: 'Videos' })).toHaveAttribute('href', '/?type=video')
    expect(filters.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/')
    expect(filters.getByRole('link', { name: 'Photos' })).not.toHaveAttribute('aria-current')
    expect(filters.getByRole('link', { name: 'Photos' })).toHaveAttribute('href', '/?type=photo')
    expect(filters.getByRole('link', { name: 'Links' })).toHaveAttribute('href', '/?type=link')
    expect(filters.getByRole('link', { name: 'News' })).toHaveAttribute('href', '/?type=news')
  })

  it('Given a middle video page, should preserve its filter when paging', () => {
    renderFeed({ data: [], meta: { total: 36, page: 2, pageSize: 12 } }, 'video')

    const pagination = within(screen.getByRole('navigation', { name: 'Browse the journal' }))
    expect(pagination.getByRole('link', { name: 'Newer posts' })).toHaveAttribute(
      'href',
      '/?type=video',
    )
    expect(pagination.getByRole('link', { name: 'Older posts' })).toHaveAttribute(
      'href',
      '/?type=video&page=3',
    )
  })

  it('Given a search, should show its heading and keep the query in filters and paging', () => {
    renderFeed({ data: [], meta: { total: 36, page: 2, pageSize: 12 } }, 'video', 'bay')

    expect(screen.getByRole('heading', { name: 'Results for “bay”' })).toBeVisible()
    const filters = within(screen.getByRole('navigation', { name: 'Filter posts' }))
    expect(filters.getByRole('link', { name: 'Photos' })).toHaveAttribute(
      'href',
      '/?type=photo&q=bay',
    )
    const pagination = within(screen.getByRole('navigation', { name: 'Browse the journal' }))
    expect(pagination.getByRole('link', { name: 'Older posts' })).toHaveAttribute(
      'href',
      '/?type=video&q=bay&page=3',
    )
  })

  it('Given a search without matches, should show the empty message with a single clear link', () => {
    renderFeed({ data: [], meta: { total: 0, page: 1, pageSize: 12 } }, 'all', 'nothing')

    expect(screen.getByText('No posts match “nothing”.')).toBeVisible()
    const clear = screen.getAllByRole('link', { name: 'Clear search' })
    expect(clear).toHaveLength(1)
    expect(clear[0]).toHaveAttribute('href', '/')
    expect(screen.queryByRole('heading', { name: 'Nothing here yet.' })).not.toBeInTheDocument()
  })

  it('Given no search, should not show a results heading', () => {
    renderFeed({ data: [], meta: { total: 0, page: 1, pageSize: 12 } })

    expect(screen.queryByText(/Results for/)).not.toBeInTheDocument()
  })

  it('Given no publications, should explain the empty journal', () => {
    renderFeed({ data: [], meta: { total: 0, page: 1, pageSize: 12 } })

    expect(screen.getByRole('heading', { name: 'Nothing here yet.' })).toBeVisible()
    expect(screen.getByText('Come back soon for new moments and discoveries.')).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Browse the journal' })).not.toBeInTheDocument()
  })

  it('Given a titled photo, should show the title above its caption', () => {
    renderFeed({
      data: [
        {
          id: 'AbCdEfGh12',
          type: 'photo',
          status: 'published',
          title: '::title::',
          text: '::caption::',
          likes: 0,
          publishedAt: '2026-10-24T10:00:00.000Z',
          createdAt: '2026-10-24T10:00:00.000Z',
          updatedAt: '2026-10-24T10:00:00.000Z',
          image: null,
        },
      ],
      meta: { total: 1, page: 1, pageSize: 12 },
    })

    expect(screen.getByRole('heading', { name: '::title::' })).toBeVisible()
    expect(screen.getByText('::caption::')).toBeVisible()
  })
})
