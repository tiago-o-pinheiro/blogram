import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { Models } from '@/models'

import { PlacesView } from './places-view'

const toPin = (overrides: Partial<Models.PlacePin> = {}): Models.PlacePin => ({
  name: '::place::',
  coordinates: { lat: 38.7, lon: -9.1 },
  place: Models.toFeedPlaceKey({ name: '::place::', coordinates: { lat: 38.7, lon: -9.1 } }),
  count: 2,
  cover: null,
  ...overrides,
})

const renderView = (pins: Models.PlacePin[]) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PlacesView pins={pins} />
    </I18nProvider>,
  )

describe('PlacesView', () => {
  it('Given places, should show grouped counts and filtered feed links', () => {
    const pin = toPin()
    renderView([pin])

    const list = within(screen.getByRole('list', { name: 'All places' }))
    expect(list.getByRole('heading', { name: pin.name })).toBeVisible()
    expect(list.getByText('Posts: 2')).toBeVisible()
    expect(list.getByRole('link', { name: 'Go to posts' })).toHaveAttribute(
      'href',
      Models.toFeedHref('all', 1, { place: pin.place }),
    )
    expect(list.getAllByRole('link')).toHaveLength(1)
  })

  it('Given coordinates, should show the map and tiles note immediately', () => {
    renderView([toPin()])

    expect(screen.getByRole('region', { name: 'Map of places' })).toBeVisible()
    expect(screen.getByText('The map loads tiles from OpenStreetMap.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Show map' })).not.toBeInTheDocument()
  })

  it('BH-AUDIT-6: Given a small cover, should use its existing full image', () => {
    const image = {
      id: '3f6f5d5e-5b5a-4c1e-9d0e-1a2b3c4d5e6f',
      width: 400,
      height: 300,
      variants: [],
    }
    renderView([
      toPin({
        cover: {
          id: 'Aaaaa11111',
          type: 'photo',
          title: '::title::',
          publishedAt: '2026-01-01T00:00:00Z',
          image,
        },
      }),
    ])

    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      `${Models.MEDIA_PATH}/${image.id}`,
    )
    expect(screen.queryByRole('link', { name: '::title::' })).not.toBeInTheDocument()
  })

  it('Given only places without coordinates, should keep the grouped cards', () => {
    renderView([toPin({ coordinates: null })])

    expect(screen.getByRole('heading', { name: '::place::' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Go to posts' })).toBeVisible()
  })

  it('Given no places, should show the empty state', () => {
    renderView([])

    expect(screen.getByText('No places yet.')).toBeVisible()
  })
})
