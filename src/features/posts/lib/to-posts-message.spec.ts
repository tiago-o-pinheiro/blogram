import { describe, expect, it } from 'vitest'

import { toPostsMessageKey } from './to-posts-message'

describe('toPostsMessageKey', () => {
  it.each([
    [401, 'posts.error.unauthorized'],
    [413, 'posts.error.tooLarge'],
    [422, 'posts.error.invalid'],
  ])('Given status %i, should return %s', (status, key) => {
    expect(toPostsMessageKey(status)).toBe(key)
  })

  it('Given an unmapped status, should return the generic key', () => {
    expect(toPostsMessageKey(500)).toBe('posts.error.generic')
  })
})
