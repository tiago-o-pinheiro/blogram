import { describe, expect, it } from 'vitest'

import { type Models } from '@/models'

import { toPostSummary } from '@/server/modules/feed/services/to-post-summary'

const IMAGE_ID = '11111111-1111-4111-8111-111111111111'

const buildPost = (overrides: Partial<Models.Post> = {}): Models.Post => ({
  id: 'Aaaaa11111',
  type: 'photo',
  status: 'published',
  text: '::caption::',
  likes: 0,
  publishedAt: '2026-05-10T10:00:00.000Z',
  createdAt: '2026-05-09T10:00:00.000Z',
  updatedAt: '2026-05-09T10:00:00.000Z',
  image: null,
  ...overrides,
})

describe('toPostSummary', () => {
  it('Given a titled post, should use the post title', () => {
    const summary = toPostSummary(buildPost({ title: '::title::', text: '::other::' }))

    expect(summary.title).toBe('::title::')
  })

  it('Given an untitled caption with messy whitespace, should collapse and trim it', () => {
    const summary = toPostSummary(buildPost({ text: '  first \n\n  second\t third  ' }))

    expect(summary.title).toBe('first second third')
  })

  it('Given a caption over 80 graphemes with an emoji at the cut, should keep the emoji whole', () => {
    const family = '👨‍👩‍👧‍👦'
    const summary = toPostSummary(buildPost({ text: `${'a'.repeat(79)}${family}tail` }))

    expect(summary.title).toBe(`${'a'.repeat(79)}${family}`)
  })

  it('Given a cut that ends in a space, should trim the title again', () => {
    const summary = toPostSummary(buildPost({ text: `${'a'.repeat(79)} bbb` }))

    expect(summary.title).toBe('a'.repeat(79))
  })

  it('Given a whitespace-only caption, should return an empty title', () => {
    const summary = toPostSummary(buildPost({ text: ' \n\t ' }))

    expect(summary.title).toBe('')
  })

  it('Given a post with a full image, should keep only id, width and height', () => {
    const summary = toPostSummary(
      buildPost({
        image: {
          id: IMAGE_ID,
          width: 400,
          height: 300,
          altText: '::alt::',
          variants: [],
          placeholder: 'data:image/jpeg;base64,AAAA',
        },
      }),
    )

    expect(summary.image).toEqual({ id: IMAGE_ID, width: 400, height: 300 })
  })

  it('Given a post without an image, should return a null image', () => {
    expect(toPostSummary(buildPost()).image).toBeNull()
  })

  it('Given a YouTube post, should carry its video thumbnail', () => {
    const summary = toPostSummary(
      buildPost({
        type: 'youtube',
        youtube: {
          videoId: 'dQw4w9WgXcQ',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        },
      }),
    )

    expect(summary.thumbnailUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('Given a post without a YouTube video, should leave the thumbnail out', () => {
    expect(toPostSummary(buildPost())).not.toHaveProperty('thumbnailUrl')
  })
})
