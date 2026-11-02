import { Value } from 'typebox/value'
import { describe, expect, it } from 'vitest'

import {
  FEED_SEARCH_MAX,
  FEED_PLACE_MAX,
  FeedQuery,
  toFeedPlace,
  toFeedPlaceKey,
  readFeedPlace,
  toArchiveYear,
  toFeedFilter,
  toFeedHref,
  toFeedPage,
  toFeedSearch,
} from './feed.model'

describe('Feed navigation', () => {
  it('Given a filter and page, should preserve both in its URL', () => {
    expect(toFeedHref('video', 3)).toBe('/?type=video&page=3')
    expect(toFeedHref('all')).toBe('/')
  })

  it('Given a search, should keep it between the filter and the page', () => {
    expect(toFeedHref('photo', 2, { q: 'a b' })).toBe('/?type=photo&q=a+b&page=2')
    expect(toFeedHref('all', 1, { q: 'sea' })).toBe('/?q=sea')
  })

  it.each([undefined, '', '   ', ['x'], 'x'.repeat(FEED_SEARCH_MAX + 1)])(
    'Given a junk search %s, should return nothing',
    (value) => {
      expect(toFeedSearch(value)).toBeUndefined()
    },
  )

  it('Given a padded search, should trim it', () => {
    expect(toFeedSearch('  sea  ')).toBe('sea')
  })

  it.each(['1969', '99999', '20x6', '', undefined, ['2026']])(
    'Given an invalid year %s, should return nothing',
    (value) => {
      expect(toArchiveYear(value)).toBeUndefined()
    },
  )

  it('Given a four digit year, should parse it', () => {
    expect(toArchiveYear('2026')).toBe(2026)
    expect(toArchiveYear('1970')).toBe(1970)
  })

  it.each(['0', '-1', '2x', '1.5', '1000000', undefined, ['2']])(
    'Given an invalid page %s, should use the first page',
    (value) => {
      expect(toFeedPage(value)).toBe(1)
    },
  )

  it('Given an unsupported filter, should show all posts', () => {
    expect(toFeedFilter('youtube')).toBe('all')
    expect(toFeedFilter('video')).toBe('video')
    expect(toFeedPage('12')).toBe(12)
  })
})

describe('Feed place scope', () => {
  it('Given a padded place parameter, should trim and canonicalize it', () => {
    const place = { name: '::place::', coordinates: { lat: 38.7, lon: -9.1 } }

    expect(toFeedPlace(`  ${JSON.stringify(place)}  `)).toBe(toFeedPlaceKey(place))
    expect(readFeedPlace(toFeedPlaceKey(place))).toEqual(place)
    expect(
      toFeedPlace(JSON.stringify({ coordinates: { lon: -9.1, lat: 38.7 }, name: place.name })),
    ).toBe(toFeedPlaceKey(place))
    expect(Value.Check(FeedQuery, { page: 1, pageSize: 12, place: toFeedPlaceKey(place) })).toBe(
      true,
    )
  })

  it.each([
    undefined,
    '',
    ' ',
    ['::place::'],
    '::place::',
    '{}',
    'x'.repeat(FEED_PLACE_MAX + 1),
    JSON.stringify({ name: '::place::', coordinates: { lat: 91, lon: 0 } }),
    JSON.stringify({ name: '::place::', coordinates: null, extra: true }),
  ])('Given invalid place %s, should ignore it', (value) => {
    expect(toFeedPlace(value)).toBeUndefined()
  })

  it('Given a place with delimiters, should preserve its exact identity when paging', () => {
    const place = toFeedPlaceKey({ name: '::place|with,"delimiters::', coordinates: null })
    const href = toFeedHref('photo', 3, { q: 'bay', place })
    const params = new URL(href, 'https://example.test').searchParams

    expect(params.get('place')).toBe(place)
    expect(params.get('q')).toBe('bay')
    expect(params.get('type')).toBe('photo')
    expect(params.get('page')).toBe('3')
  })
})
