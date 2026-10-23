import { describe, expect, it } from 'vitest'

import { normalizeWebUrl, normalizeYoutubeUrl } from './post-url'

describe('post URLs', () => {
  it.each([
    'https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://m.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?t=12',
  ])('Given the YouTube URL %s, should normalize its video', (url) => {
    expect(normalizeYoutubeUrl(url)).toEqual({
      videoId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    })
  })

  it.each([
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://evil.test/youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=short',
    '<iframe src="https://youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    'javascript:alert(1)',
    'https://owner:password@youtube.com/watch?v=dQw4w9WgXcQ',
  ])('Given the unsupported video URL %s, should reject it', (url) => {
    expect(() => normalizeYoutubeUrl(url)).toThrow()
  })

  it.each(['file:///etc/passwd', 'data:text/html,test', '//example.com', 'ftp://example.com'])(
    'Given the unsafe destination %s, should reject it',
    (url) => {
      expect(() => normalizeWebUrl(url)).toThrow()
    },
  )
})
