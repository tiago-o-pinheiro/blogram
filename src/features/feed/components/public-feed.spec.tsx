import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { type Models } from '@/models'

import { PublicFeed } from './public-feed'

const renderFeed = (page: Models.PostPage, filter: Models.FeedFilter = 'all') =>
  render(
    <PublicFeed
      page={page}
      filter={filter}
      owner="::owner::"
      origin="https://example.test"
      locale="en"
      messages={getMessages('en')}
    />,
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

  it('Given no publications, should explain the empty journal', () => {
    renderFeed({ data: [], meta: { total: 0, page: 1, pageSize: 12 } })

    expect(screen.getByRole('heading', { name: 'Nothing here yet.' })).toBeVisible()
    expect(screen.getByText('Come back soon for new moments and discoveries.')).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Browse the journal' })).not.toBeInTheDocument()
  })
})
