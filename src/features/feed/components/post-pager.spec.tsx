import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { type Models } from '@/models'

import { PostPager } from './post-pager'

const summary = (overrides: Partial<Models.PostSummary> = {}): Models.PostSummary => ({
  id: 'AbCdEfGh12',
  type: 'photo',
  title: '::title::',
  publishedAt: '2026-10-20T12:00:00.000Z',
  image: null,
  ...overrides,
})

const renderPager = (adjacent: Models.AdjacentPosts) =>
  render(<PostPager adjacent={adjacent} messages={getMessages('en')} />)

describe('PostPager', () => {
  it('Given both neighbours, should link to each permanent page with its title', () => {
    renderPager({
      newer: summary({ id: 'Newer12345', title: 'Newer title' }),
      older: summary({ id: 'Older12345', title: 'Older title' }),
    })

    expect(screen.getByRole('navigation', { name: 'More posts' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Newer title/ })).toHaveAttribute(
      'href',
      '/posts/Newer12345',
    )
    expect(screen.getByRole('link', { name: /Older title/ })).toHaveAttribute(
      'href',
      '/posts/Older12345',
    )
  })

  it('Given only an older neighbour, should show a single link', () => {
    renderPager({ newer: null, older: summary({ id: 'Older12345' }) })

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Older/ })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Newer/ })).not.toBeInTheDocument()
  })

  it('Given a neighbour without a title, should fall back to its type label', () => {
    renderPager({ newer: summary({ title: '', type: 'video' }), older: null })

    expect(screen.getByRole('link', { name: /Videos/ })).toBeVisible()
  })

  it('Given no neighbours, should render nothing', () => {
    renderPager({ newer: null, older: null })

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
