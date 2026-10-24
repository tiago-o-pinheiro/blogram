// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as GET_PLACES } from '@/app/api/admin/places/route'
import { createOwnerSession } from '@/test/auth-session'

const BASE_URL = 'http://localhost:3000/api/admin/places'

const send = (query: string, cookie?: string) =>
  new Request(`${BASE_URL}${query}`, { headers: cookie ? { cookie } : {} })

const PHOTON_BODY = {
  features: [
    {
      geometry: { coordinates: [26.1, 44.43] },
      properties: { osm_type: 'R', osm_id: 7, name: '::city::', country: '::country::' },
    },
  ],
}

describe('admin places route', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  it('Given no session, should refuse the search', async () => {
    const response = await GET_PLACES(send('?q=::city::'))

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given a one letter query, should reject it before searching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await GET_PLACES(send('?q=a', cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Given the owner and a city query, should return the matching cities', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(PHOTON_BODY))

    const response = await GET_PLACES(send('?q=::city::&lang=es', cookie))

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({
      data: [
        { id: 'R7', name: '::city::', region: '', country: '::country::', lat: 44.43, lon: 26.1 },
      ],
    })
  })

  it('Given the provider is down, should answer that the search is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))

    const response = await GET_PLACES(send('?q=::city::', cookie))

    expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE)
  })
})
