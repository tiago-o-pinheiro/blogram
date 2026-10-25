import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { type Models } from '@/models'

import { ArchiveView } from './archive-view'

const IMAGE_ID = '11111111-1111-4111-8111-111111111111'

const archive: Models.Archive = {
  years: [
    { year: 2026, count: 2 },
    { year: 2025, count: 1 },
  ],
  year: 2026,
  months: [
    {
      month: '2026-05',
      posts: [
        {
          id: 'Aaaaa11111',
          type: 'photo',
          title: '::sunset::',
          publishedAt: '2026-05-10T10:00:00.000Z',
          image: { id: IMAGE_ID, width: 100, height: 100, altText: '', variants: [] },
        },
      ],
    },
    {
      month: '2026-02',
      posts: [
        {
          id: 'Bbbbb22222',
          type: 'news',
          title: '::headline::',
          publishedAt: '2026-02-10T10:00:00.000Z',
          image: null,
        },
      ],
    },
  ],
}

const renderView = (value: Models.Archive) =>
  render(<ArchiveView archive={value} locale="en" messages={getMessages('en')} />)

describe('ArchiveView', () => {
  it('Given several years, should link each year and mark the selected one', () => {
    renderView(archive)

    const years = within(screen.getByRole('navigation', { name: 'Years' }))
    expect(years.getByRole('link', { name: '2026' })).toHaveAttribute('aria-current', 'page')
    expect(years.getByRole('link', { name: '2025' })).toHaveAttribute('href', '/archive?year=2025')
    expect(years.getByRole('link', { name: '2025' })).not.toHaveAttribute('aria-current')
  })

  it('Given months with photos and text posts, should show thumbnails and title tiles linking to posts', () => {
    renderView(archive)

    expect(screen.getByRole('heading', { level: 2, name: 'May 2026' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'February 2026' })).toBeVisible()
    const photo = screen.getByRole('link', { name: '::sunset::' })
    expect(photo).toHaveAttribute('href', '/posts/Aaaaa11111')
    expect(photo.querySelector('img')?.getAttribute('src')).toContain(`${IMAGE_ID}?variant=w480`)
    const tile = screen.getByRole('link', { name: '::headline::' })
    expect(tile).toHaveAttribute('href', '/posts/Bbbbb22222')
    expect(tile.querySelector('img')).toBeNull()
  })

  it('Given no archived posts, should show the empty state', () => {
    renderView({ years: [], year: null, months: [] })

    expect(screen.getByText('Nothing archived yet.')).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Years' })).not.toBeInTheDocument()
  })
})
