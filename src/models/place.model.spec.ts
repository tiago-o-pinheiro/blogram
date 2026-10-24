import { describe, expect, it } from 'vitest'

import { readPlaceCoordinates, toPlaceLabel, toPlaceMapUrl } from './place.model'

describe('toPlaceMapUrl', () => {
  it('Given precise coordinates, should pin them on OpenStreetMap', () => {
    expect(toPlaceMapUrl({ lat: 44.4361414, lon: 26.102684 })).toBe(
      'https://www.openstreetmap.org/?mlat=44.43614&mlon=26.10268#map=12/44.43614/26.10268',
    )
  })
})

describe('readPlaceCoordinates', () => {
  it('Given a pinned map link, should read its coordinates back', () => {
    expect(readPlaceCoordinates(toPlaceMapUrl({ lat: -33.86, lon: 151.21 }))).toEqual({
      lat: -33.86,
      lon: 151.21,
    })
  })

  it('Given a map link without a pin, should read the map center', () => {
    expect(readPlaceCoordinates('https://www.openstreetmap.org/#map=15/40.4168/-3.7038')).toEqual({
      lat: 40.4168,
      lon: -3.7038,
    })
  })

  it.each([
    [undefined],
    ['https://www.openstreetmap.org/node/123'],
    ['https://www.openstreetmap.org/?mlat=95&mlon=10'],
    ['not a url'],
  ])('Given %s, should not invent coordinates', (mapUrl) => {
    expect(readPlaceCoordinates(mapUrl)).toBeNull()
  })
})

describe('toPlaceLabel', () => {
  it('Given a city and its country, should join them', () => {
    expect(toPlaceLabel({ name: '::city::', country: '::country::' })).toBe('::city::, ::country::')
  })

  it('Given no country, should keep the city alone', () => {
    expect(toPlaceLabel({ name: '::city::', country: '' })).toBe('::city::')
  })
})
