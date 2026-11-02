import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { Models } from '@/models'

import { PlacesMap } from './places-map'

describe('PlacesMap', () => {
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
