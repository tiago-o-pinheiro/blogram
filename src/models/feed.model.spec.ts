import { describe, expect, it } from 'vitest'

import { toFeedFilter, toFeedHref, toFeedPage } from './feed.model'

describe('Feed navigation', () => {
  it('Given a filter and page, should preserve both in its URL', () => {
    expect(toFeedHref('video', 3)).toBe('/?type=video&page=3')
    expect(toFeedHref('all')).toBe('/')
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
