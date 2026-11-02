import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import L from 'leaflet'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { Models } from '@/models'

import { PlacesMap } from './places-map'
import { FIT_PADDING_TOP_LEFT } from '../lib/map-fit'

const toPin = (name: string, lat: number, lon: number): Models.PlacePin => ({
  name,
  coordinates: { lat, lon },
  place: Models.toFeedPlaceKey({ name, coordinates: { lat, lon } }),
  count: 1,
  cover: null,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PlacesMap', () => {
  it('Given pins near the top left corner, should fit them clear of the zoom buttons', () => {
    const fitBounds = vi.spyOn(L.Map.prototype, 'fitBounds')

    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <PlacesMap
          pins={[toPin('London', 51.50745, -0.12777), toPin('İstanbul', 41.00638, 28.97587)]}
        />
      </I18nProvider>,
    )

    expect(fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paddingTopLeft: FIT_PADDING_TOP_LEFT }),
    )
    expect(FIT_PADDING_TOP_LEFT[0]).toBeGreaterThanOrEqual(64)
  })

  it('Given a pin, should render its map and filtered posts popup', async () => {
    const user = userEvent.setup()
    const place = Models.toFeedPlaceKey({
      name: '::place::',
      coordinates: { lat: 38.7, lon: -9.1 },
    })
    const view = render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <PlacesMap
          pins={[
            {
              name: '::place::',
              coordinates: { lat: 38.7, lon: -9.1 },
              place,
              count: 2,
              cover: null,
            },
          ]}
        />
      </I18nProvider>,
    )

    expect(view.container.querySelector('.leaflet-container')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '::place::' }))

    expect(screen.getByRole('link', { name: 'View posts' })).toHaveAttribute(
      'href',
      Models.toFeedHref('all', 1, { place }),
    )
  })
})
