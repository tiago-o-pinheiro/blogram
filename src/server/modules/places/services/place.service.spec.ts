import { describe, expect, it, vi } from 'vitest'

import { ServiceUnavailableError } from '@/server/errors/http-errors'

import { PlaceService } from './place.service'

const toFeature = (properties: Record<string, unknown>, coordinates = [26.1, 44.43]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties: { osm_type: 'R', osm_id: 1, ...properties },
})

const toService = (respond: () => Promise<Response>) => {
  const send = vi.fn<typeof fetch>(respond)
  return { send, service: new PlaceService(send) }
}

const respondWith = (body: unknown) => () => Promise.resolve(Response.json(body))

describe('PlaceService', () => {
  it('Given a city query, should ask for settlements in the visitor language', async () => {
    const { send, service } = toService(respondWith({ features: [] }))

    await service.search({ q: ' ::city:: ', lang: 'en' })

    const [url, init] = send.mock.calls[0] ?? []
    expect(url).toBeInstanceOf(URL)
    const params = new URL(String(url)).searchParams
    expect(params.get('q')).toBe('::city::')
    expect(params.get('limit')).toBe('8')
    expect(params.get('lang')).toBe('en')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(init?.headers).get('user-agent')).toContain('Blogram')
  })

  it('Given a village filed as part of a commune, should still search villages', async () => {
    const { send, service } = toService(respondWith({ features: [] }))

    await service.search({ q: 'Viscri', lang: 'en' })

    const params = new URL(String(send.mock.calls[0]?.[0])).searchParams
    expect(params.getAll('layer')).toEqual(['city', 'district'])
    expect(params.getAll('osm_tag')).toEqual([
      'place:city',
      'place:town',
      'place:village',
      'place:municipality',
    ])
  })

  it('Given Spanish, should use local names because the provider has no Spanish names', async () => {
    const { send, service } = toService(respondWith({ features: [] }))

    await service.search({ q: '::city::', lang: 'es' })

    expect(new URL(String(send.mock.calls[0]?.[0])).searchParams.get('lang')).toBe('default')
  })

  it('Given matching cities, should return their names, regions, countries and pins', async () => {
    const { service } = toService(
      respondWith({
        features: [
          toFeature({ osm_id: 7, name: '::city::', state: '::region::', country: '::country::' }),
          toFeature(
            { osm_type: 'N', osm_id: 8, name: '::town::', county: '::county::' },
            [-3.7, 40.4],
          ),
        ],
      }),
    )

    expect(await service.search({ q: '::city::', lang: 'en' })).toEqual([
      {
        id: 'R7',
        name: '::city::',
        region: '::region::',
        country: '::country::',
        lat: 44.43,
        lon: 26.1,
      },
      { id: 'N8', name: '::town::', region: '::county::', country: '', lat: 40.4, lon: -3.7 },
    ])
  })

  it('Given duplicated or unnamed results, should keep one entry per named place', async () => {
    const { service } = toService(
      respondWith({
        features: [
          toFeature({ osm_id: 1, name: '::city::', country: '::country::' }),
          toFeature({ osm_type: 'N', osm_id: 2, name: '::city::', country: '::country::' }),
          toFeature({ osm_id: 3 }),
          { geometry: { coordinates: ['::lon::', 1] }, properties: { name: '::broken::' } },
        ],
      }),
    )

    expect((await service.search({ q: '::city::', lang: 'en' })).map((place) => place.id)).toEqual([
      'R1',
    ])
  })

  it.each([
    ['an error status', () => Promise.resolve(new Response(null, { status: 502 }))],
    ['an unexpected body', respondWith({ results: [] })],
    ['a network failure', () => Promise.reject(new TypeError('::offline::'))],
  ])(
    'Given %s from the provider, should report the search as unavailable',
    async (_name, respond) => {
      const { service } = toService(respond)

      await expect(service.search({ q: '::city::', lang: 'en' })).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      )
    },
  )
})
