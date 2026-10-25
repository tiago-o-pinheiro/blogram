import { describe, expect, it } from 'vitest'

import {
  FEED_SEARCH_MAX,
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
