import { describe, expect, it } from 'vitest'

import { toPostsErrorKey, toPostsMessageKey } from './to-posts-message'
import { PostsApiError } from '../api/posts-api'

describe('toPostsErrorKey', () => {
  it('Given a storageCors reason, should return the storageCors key', () => {
    expect(toPostsErrorKey(new PostsApiError(0, 'storageCors'))).toBe('posts.error.storageCors')
  })

  it('Given an interrupted reason with a 403 status, should return the interrupted key', () => {
    expect(toPostsErrorKey(new PostsApiError(403, 'interrupted'))).toBe('posts.error.interrupted')
  })

  it('Given a plain status error, should map by status', () => {
    expect(toPostsErrorKey(new PostsApiError(413))).toBe('posts.error.tooLarge')
  })

  it('Given a foreign error, should return the generic key', () => {
    expect(toPostsErrorKey(new Error('x'))).toBe('posts.error.generic')
  })
})

describe('toPostsMessageKey', () => {
  it.each([0, 408, 502, 504, 520, 521, 522, 523, 524])(
    'Given status %i, should return the interrupted key',
    (status) => {
      expect(toPostsMessageKey(status)).toBe('posts.error.interrupted')
    },
  )

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
