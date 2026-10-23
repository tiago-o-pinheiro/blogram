import { describe, expect, it } from 'vitest'

import { formatFileSize, toFormatLabel } from './media-format'

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [524288, '512 KB'],
    [1048575, '1 MB'],
    [2516582, '2.4 MB'],
    [10485760, '10 MB'],
    [268435456, '256 MB'],
    [2147483648, '2 GB'],
  ])('Given %i bytes, should read %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })

  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1025, '1.1 KB'],
    [10485760, '10 MB'],
    [10485761, '10.1 MB'],
    [2147483649, '2.1 GB'],
  ])('Given %i bytes rounded up, should read %s', (bytes, expected) => {
    expect(formatFileSize(bytes, 'up')).toBe(expected)
  })
})

describe('toFormatLabel', () => {
  it.each([
    ['image/jpeg', 'JPEG'],
    ['image/png', 'PNG'],
    ['image/webp', 'WebP'],
    ['video/mp4', 'MP4'],
    ['video/webm', 'WebM'],
  ])('Given %s, should read %s', (mimeType, expected) => {
    expect(toFormatLabel(mimeType)).toBe(expected)
  })

  it('Given an unlisted type, should fall back to its upper-case subtype', () => {
    expect(toFormatLabel('image/gif')).toBe('GIF')
  })
})
