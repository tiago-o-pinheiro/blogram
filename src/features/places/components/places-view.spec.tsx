import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { PlacesView } from './places-view'

const summary = (id: string, title: string): Models.PostSummary => ({
  id,
  type: 'news',
  title,
  publishedAt: '2026-05-10T10:00:00.000Z',
  image: null,
})

const renderView = (pins: Models.PlacePin[]) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PlacesView pins={pins} />
    </I18nProvider>,
  )

describe('PlacesView', () => {
  it('Given places, should list each with its posts and load no map by default', () => {
    renderView([
      {
        name: 'Lisbon',
        coordinates: { lat: 38.7, lon: -9.1 },
        posts: [summary('Aaaaa11111', '::first::'), summary('Bbbbb22222', '::second::')],
      },
      { name: 'Porto', coordinates: null, posts: [summary('Ccccc33333', '::third::')] },
    ])

    const list = within(screen.getByRole('list', { name: 'All places' }))
    expect(list.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
    expect(list.getByText('Posts: 2')).toBeVisible()
    expect(list.getByRole('link', { name: '::second::' })).toHaveAttribute(
      'href',
      '/posts/Bbbbb22222',
    )
    expect(screen.getByRole('button', { name: 'Show map' })).toBeVisible()
    expect(screen.queryByText('The map loads tiles from OpenStreetMap.')).not.toBeInTheDocument()
  })

  it('Given places with coordinates, should reveal the consent note after Show map', async () => {
    const user = userEvent.setup()
    renderView([
      {
        name: 'Lisbon',
        coordinates: { lat: 38.7, lon: -9.1 },
        posts: [summary('Aaaaa11111', 'A')],
      },
    ])

    await user.click(screen.getByRole('button', { name: 'Show map' }))

    expect(screen.getByText('The map loads tiles from OpenStreetMap.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Show map' })).not.toBeInTheDocument()
  })

  it('Given only places without coordinates, should stay list-only', () => {
    renderView([{ name: 'Porto', coordinates: null, posts: [summary('Ccccc33333', 'C')] }])

    expect(screen.queryByRole('button', { name: 'Show map' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Porto' })).toBeVisible()
  })

  it('Given no places, should show the empty state', () => {
    renderView([])

    expect(screen.getByText('No places yet.')).toBeVisible()
  })
})
