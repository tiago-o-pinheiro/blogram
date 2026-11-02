import { describe, expect, it } from 'vitest'

import { groupPlaces, type PlaceGroup } from './group-places'

const BARCELONA = { lat: 41.38258, lon: 2.17707 }
const MONTJUIC = { lat: 41.35419, lon: 2.15376 }
const BADALONA = { lat: 41.45004, lon: 2.24741 }
const ISTANBUL = { lat: 41.00638, lon: 28.97587 }

const toGroup = (name: string, coordinates: PlaceGroup['coordinates'], count = 1): PlaceGroup => ({
  name,
  coordinates,
  count,
})

const toNames = (clusters: PlaceGroup[][]) =>
  clusters.map((cluster) => cluster.map((group) => group.name))

describe('groupPlaces', () => {
  it('Given one city named in two languages and two spots, should group them under one place', () => {
    const clusters = groupPlaces([
      toGroup('Barcelona, España', MONTJUIC),
      toGroup('Barcelona, España', BARCELONA),
      toGroup('İstanbul, Türkiye', ISTANBUL),
      toGroup('Barcelona, Spain', BARCELONA),
    ])

    expect(toNames(clusters)).toEqual([
      ['Barcelona, España', 'Barcelona, España', 'Barcelona, Spain'],
      ['İstanbul, Türkiye'],
    ])
  })

  it('Given a place with more posts, should lead its group so it names the place', () => {
    const clusters = groupPlaces([
      toGroup('Barcelona, España', BARCELONA, 1),
      toGroup('Barcelona, Spain', MONTJUIC, 4),
    ])

    expect(clusters[0]?.[0]?.name).toBe('Barcelona, Spain')
  })

  it('Given a nearby town with another name, should keep it as its own place', () => {
    const clusters = groupPlaces([
      toGroup('Barcelona, España', BARCELONA),
      toGroup('Badalona, España', BADALONA),
    ])

    expect(clusters).toHaveLength(2)
  })

  it('Given different names at the same spot, should group them', () => {
    const clusters = groupPlaces([
      toGroup('London, United Kingdom', { lat: 51.50745, lon: -0.12777 }),
      toGroup('Londres, Reino Unido', { lat: 51.5074, lon: -0.1278 }),
    ])

    expect(clusters).toHaveLength(1)
  })

  it('Given the same name far apart, should keep the places apart', () => {
    const clusters = groupPlaces([
      toGroup('Paris, France', { lat: 48.8566, lon: 2.3522 }),
      toGroup('Paris, United States', { lat: 33.6609, lon: -95.5555 }),
    ])

    expect(clusters).toHaveLength(2)
  })

  it('Given a place without coordinates, should group it by accent-insensitive name', () => {
    const clusters = groupPlaces([
      toGroup('Montréal', null),
      toGroup('Montreal, Canada', { lat: 45.50169, lon: -73.56725 }),
      toGroup('Toronto', null),
    ])

    expect(toNames(clusters)).toEqual([['Montreal, Canada', 'Montréal'], ['Toronto']])
  })

  it('Given a place without coordinates matching two places, should join the busier one', () => {
    const clusters = groupPlaces([
      toGroup('Barcelona, España', BARCELONA, 1),
      toGroup('Barcelona, Venezuela', { lat: 10.13625, lon: -64.68618 }, 1),
      toGroup('Barcelona, Spain', MONTJUIC, 3),
      toGroup('Barcelona', null, 1),
    ])

    expect(toNames(clusters)).toEqual([
      ['Barcelona, Spain', 'Barcelona, España', 'Barcelona'],
      ['Barcelona, Venezuela'],
    ])
  })

  it('Given a name used by most posts of a place, should name the place after it', () => {
    const clusters = groupPlaces([
      toGroup('Barcelona, Spain', BARCELONA, 2),
      toGroup('Barcelona, España', MONTJUIC, 1),
      toGroup('Barcelona, España', BARCELONA, 2),
    ])

    expect(clusters[0]?.[0]).toEqual(toGroup('Barcelona, España', BARCELONA, 2))
  })

  it('Given groups ordered by recency, should order places by their newest group', () => {
    const clusters = groupPlaces([
      toGroup('İstanbul, Türkiye', ISTANBUL, 1),
      toGroup('Barcelona, España', BARCELONA, 5),
    ])

    expect(toNames(clusters)).toEqual([['İstanbul, Türkiye'], ['Barcelona, España']])
  })
})
