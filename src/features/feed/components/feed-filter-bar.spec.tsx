import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { FeedFilterBar } from './feed-filter-bar'

const renderBar = (filter: Models.FeedFilter = 'all', query?: string) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <FeedFilterBar filter={filter} query={query} />
    </I18nProvider>,
  )

describe('FeedFilterBar', () => {
  it('Given no query, should render the filter links and a search button without a search row', () => {
    renderBar('video')

    const filters = screen.getByRole('navigation', { name: 'Filter posts' })
    expect(filters).toBeVisible()
    expect(screen.getByRole('link', { name: 'Videos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Videos' })).toHaveAttribute('href', '/?type=video')
    expect(screen.getByRole('button', { name: 'Search posts' })).toBeVisible()
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
  })

  it('Given the magnifier is pressed, should show a focused search input and a close button', async () => {
    renderBar('photo')

    await userEvent.click(screen.getByRole('button', { name: 'Search posts' }))

    const input = screen.getByRole('searchbox')
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('placeholder', 'Search posts')
    expect(screen.getByRole('search').querySelector('input[name="type"]')).toHaveValue('photo')
    expect(screen.getByRole('button', { name: 'Close search' })).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Filter posts' })).not.toBeInTheDocument()
  })

  it('Given filter mode, should render a sticky container inset from the feed column', () => {
    renderBar('video')

    const container = screen.getByRole('navigation', { name: 'Filter posts' }).parentElement
    expect(container).toHaveClass('sticky', 'mx-3', 'sm:mx-6')
  })

  it('Given search mode, should render a sticky container inset from the feed column', () => {
    renderBar('all', 'harbour')

    const container = screen.getByRole('search').parentElement
    expect(container).toHaveClass('sticky', 'mx-3', 'sm:mx-6')
  })

  it('Given a blank search, should prevent the submit', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Search posts' }))
    const submitted = vi.fn((event: Event) => event.defaultPrevented)
    document.addEventListener('submit', submitted)

    await userEvent.type(screen.getByRole('searchbox'), '   {Enter}')

    expect(submitted).toHaveReturnedWith(true)
  })

  it('Given a search form, should be a GET to the home page with the query field', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Search posts' }))

    const form = screen.getByRole('search')
    expect(form).toHaveAttribute('action', '/')
    expect(form).toHaveAttribute('method', 'get')
    expect(screen.getByRole('searchbox')).toHaveAttribute('name', 'q')
  })

  it('Given a query on load, should start in search mode prefilled with a link that clears it', () => {
    renderBar('video', 'harbour')

    expect(screen.getByRole('searchbox')).toHaveValue('harbour')
    expect(screen.getByRole('link', { name: 'Clear search' })).toHaveAttribute(
      'href',
      '/?type=video',
    )
    expect(screen.queryByRole('button', { name: 'Close search' })).not.toBeInTheDocument()
  })

  it('Given search mode without a query, should restore the filters and focus the magnifier on close', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Search posts' }))

    await userEvent.click(screen.getByRole('button', { name: 'Close search' }))

    expect(screen.getByRole('navigation', { name: 'Filter posts' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search posts' })).toHaveFocus()
  })

  it('Given search mode without a query, should close on Escape and focus the magnifier', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Search posts' }))

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search posts' })).toHaveFocus()
  })

  it('Given a changed query prop, should leave search mode when it is cleared', () => {
    const view = renderBar('all', 'sea')

    view.rerender(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <FeedFilterBar filter="all" />
      </I18nProvider>,
    )

    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search posts' })).toHaveFocus()
  })
})
