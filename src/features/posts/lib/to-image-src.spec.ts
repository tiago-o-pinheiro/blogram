import { describe, expect, it } from 'vitest'

import type * as Models from '@/models/models'

import { toImageSrc } from './to-image-src'

const IMAGE: Models.PostImage = {
  id: '3f0c9d52-6a43-4d6e-9f43-0f6a6b9a1c11',
  width: 2000,
  height: 1000,
  altText: '',
  variants: [
    { name: 'w960', width: 960, height: 480 },
    { name: 'w480', width: 480, height: 240 },
  ],
}

describe('toImageSrc', () => {
  it('Given several variants, should pick the smallest one at or above the needed width', () => {
    expect(toImageSrc(IMAGE, 480)).toBe(`/api/media/${IMAGE.id}?variant=w480`)
    expect(toImageSrc(IMAGE, 500)).toBe(`/api/media/${IMAGE.id}?variant=w960`)
  })

  it('Given no variant wide enough, should fall back to the full image', () => {
    expect(toImageSrc(IMAGE, 1200)).toBe(`/api/media/${IMAGE.id}`)
    expect(toImageSrc({ ...IMAGE, variants: [] }, 480)).toBe(`/api/media/${IMAGE.id}`)
  })
})
