import { describe, expect, it } from 'vitest'

import {
  ALT_TEXT_MAX,
  POST_TEXT_MAX,
  isPost,
  isPostListQuery,
  isPostPage,
  isPostStatusChange,
  isPostUpdate,
} from './post.model'

const toPost = () => ({
  id: 'abcDEF_-12',
  type: 'photo',
  status: 'draft',
  text: '',
  likes: 0,
  publishedAt: null,
  createdAt: '2026-10-23T00:00:00.000Z',
  updatedAt: '2026-10-23T00:00:00.000Z',
  image: {
    id: '0d9b7f5c-3f4b-4a0e-9a53-3a2f6d1b9c11',
    width: 1600,
    height: 900,
    altText: '::alt::',
    variants: [{ name: 'w480', width: 480, height: 270 }],
  },
})

describe('Post', () => {
  it('Given a valid draft photo post, should recognise it', () => {
    expect(isPost(toPost())).toBe(true)
  })

  it('Given a post without an image, should recognise it', () => {
    expect(isPost({ ...toPost(), image: null })).toBe(true)
  })

  it('Given a public id with the wrong length, should reject it', () => {
    expect(isPost({ ...toPost(), id: 'short' })).toBe(false)
  })

  it('Given negative likes, should reject it', () => {
    expect(isPost({ ...toPost(), likes: -1 })).toBe(false)
  })

  it('Given an unknown status, should reject it', () => {
    expect(isPost({ ...toPost(), status: 'archived' })).toBe(false)
  })

  it('Given a vertical video, should accept positive media dimensions', () => {
    expect(
      isPost({
        ...toPost(),
        type: 'video',
        video: {
          id: '0d9b7f5c-3f4b-4a0e-9a53-3a2f6d1b9c11',
          width: 1080,
          height: 1920,
          contentType: 'video/mp4',
        },
      }),
    ).toBe(true)
    expect(
      isPost({
        ...toPost(),
        type: 'video',
        video: {
          id: '0d9b7f5c-3f4b-4a0e-9a53-3a2f6d1b9c11',
          width: 0,
          height: 1920,
          contentType: 'video/mp4',
        },
      }),
    ).toBe(false)
  })
})

describe('PostUpdate', () => {
  it('Given an empty object, should reject it', () => {
    expect(isPostUpdate({})).toBe(false)
  })

  it('Given text and alt text at the maximum, should accept them and reject above', () => {
    expect(
      isPostUpdate({ text: 'x'.repeat(POST_TEXT_MAX), altText: 'x'.repeat(ALT_TEXT_MAX) }),
    ).toBe(true)
    expect(isPostUpdate({ text: 'x'.repeat(POST_TEXT_MAX + 1) })).toBe(false)
    expect(isPostUpdate({ altText: 'x'.repeat(ALT_TEXT_MAX + 1) })).toBe(false)
  })
})

describe('PostStatusChange', () => {
  it('Given a known status, should recognise it, and an unknown one reject it', () => {
    expect(isPostStatusChange({ status: 'published' })).toBe(true)
    expect(isPostStatusChange({ status: 'gone' })).toBe(false)
  })
})

describe('PostListQuery', () => {
  it('Given pagination with a status filter, should recognise it', () => {
    expect(isPostListQuery({ page: 1, pageSize: 20, status: 'draft' })).toBe(true)
  })

  it('Given an unknown status filter, should reject it', () => {
    expect(isPostListQuery({ page: 1, pageSize: 20, status: 'nope' })).toBe(false)
  })
})

describe('PostPage', () => {
  it('Given a page of posts, should recognise it', () => {
    expect(isPostPage({ data: [toPost()], meta: { total: 1, page: 1, pageSize: 20 } })).toBe(true)
  })
})
