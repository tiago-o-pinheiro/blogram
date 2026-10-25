import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { type Models } from '@/models'

import { FeedSearch } from './feed-search'

const renderSearch = (filter: Models.FeedFilter = 'all', query?: string) =>
  render(<FeedSearch query={query} filter={filter} messages={getMessages('en')} />)

describe('FeedSearch', () => {
  it('Given no query, should render a labelled GET form to the home page without a clear link', () => {
    renderSearch()

    const form = screen.getByRole('search', { name: 'Search the journal' })
    expect(form).toHaveAttribute('action', '/')
    expect(form).toHaveAttribute('method', 'get')
    expect(screen.getByRole('searchbox', { name: 'Search the journal' })).toHaveAttribute(
      'name',
      'q',
    )
    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('type', 'submit')
    expect(screen.queryByRole('link', { name: 'Clear search' })).not.toBeInTheDocument()
    expect(form.querySelector('input[name="type"]')).toBeNull()
  })

  it('Given a type filter and a query, should keep both and link to the cleared filter', () => {
    renderSearch('video', 'harbour')

    expect(screen.getByRole('searchbox')).toHaveValue('harbour')
    expect(screen.getByRole('search').querySelector('input[name="type"]')).toHaveValue('video')
    expect(screen.getByRole('link', { name: 'Clear search' })).toHaveAttribute(
      'href',
      '/?type=video',
    )
  })
})
