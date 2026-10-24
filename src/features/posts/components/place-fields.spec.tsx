import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { PlaceFields } from './place-fields'

const CITY: Models.PlaceSuggestion = {
  id: 'R1',
  name: '::city::',
  region: '::region::',
  country: '::country::',
  lat: 44.4361414,
  lon: 26.102684,
}

const TOWN: Models.PlaceSuggestion = { ...CITY, id: 'N2', name: '::town::', lat: 40.4, lon: -3.7 }

const SAVED_PLACE: Models.PostPlace = {
  name: '::saved::',
  mapUrl: 'https://www.openstreetmap.org/?mlat=40.4&mlon=-3.7#map=12/40.4/-3.7',
}

const PlaceEditor = ({ initialPlace = null }: { initialPlace?: Models.PostPlace | null }) => {
  const [place, setPlace] = useState<Models.PostPlace | null>(initialPlace)
  return (
    <I18nProvider locale="en" messages={getMessages('en')}>
      <PlaceFields value={place} onChange={setPlace} isDisabled={false} />
    </I18nProvider>
  )
}

const respondWithPlaces = (places: Models.PlaceSuggestion[]) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json({ data: places })))

const searchFor = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(screen.getByRole('button', { name: 'Add a place' }))
  await user.type(screen.getByRole('combobox', { name: 'Search a city' }), text)
}

describe('PlaceFields', () => {
  it('Given a typed city, should list the matching cities with their country', async () => {
    const user = userEvent.setup()
    const fetchSpy = respondWithPlaces([CITY, TOWN])
    render(<PlaceEditor />)

    await searchFor(user, '::ci')

    expect(await screen.findByRole('option', { name: /::city::/ })).toHaveTextContent(
      '::region::, ::country::',
    )
    expect(screen.getAllByRole('option')).toHaveLength(2)
    const url = new URL(String(fetchSpy.mock.lastCall?.[0]), 'http://localhost')
    expect(url.pathname).toBe('/api/admin/places')
    expect(url.searchParams.get('q')).toBe('::ci')
    expect(url.searchParams.get('lang')).toBe('en')
  })

  it('Given a chosen city, should show its map and save it with its pin', async () => {
    const user = userEvent.setup()
    respondWithPlaces([CITY])
    render(<PlaceEditor />)

    await searchFor(user, '::ci')
    await user.click(await screen.findByRole('option', { name: /::city::/ }))

    expect(
      await screen.findByRole('region', { name: 'Map of ::city::, ::country::' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Save place' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('::city::, ::country::')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Change place' })).toBeEnabled()
  })

  it('Given the arrow keys and Enter, should pick the highlighted city', async () => {
    const user = userEvent.setup()
    respondWithPlaces([CITY, TOWN])
    render(<PlaceEditor />)

    await searchFor(user, '::to')
    await screen.findByRole('option', { name: /::town::/ })
    await user.keyboard('{ArrowDown}{Enter}')

    expect(screen.getByRole('combobox', { name: 'Search a city' })).toHaveValue(
      '::town::, ::country::',
    )
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save place' })).toBeEnabled()
  })

  it('Given Cancel, should leave the post without a place', async () => {
    const user = userEvent.setup()
    respondWithPlaces([CITY])
    render(<PlaceEditor />)

    await searchFor(user, '::ci')
    await user.click(await screen.findByRole('option', { name: /::city::/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('::city::, ::country::')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a place' })).toBeEnabled()
  })

  it('Given one letter, should wait for more before searching', async () => {
    const user = userEvent.setup()
    const fetchSpy = respondWithPlaces([CITY])
    render(<PlaceEditor />)

    await searchFor(user, ':')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save place' })).toBeDisabled()
  })

  it('Given the search is down, should say so without closing', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))
    render(<PlaceEditor />)

    await searchFor(user, '::ci')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Place search is not available right now.',
    )
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('Given a saved place, should show its map when changing it and allow removing it', async () => {
    const user = userEvent.setup()
    render(<PlaceEditor initialPlace={SAVED_PLACE} />)

    await user.click(screen.getByRole('button', { name: 'Change place' }))

    expect(screen.getByRole('combobox', { name: 'Search a city' })).toHaveValue('::saved::')
    expect(await screen.findByRole('region', { name: 'Map of ::saved::' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Remove place' }))

    expect(screen.queryByText('::saved::')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a place' })).toBeEnabled()
  })
})
