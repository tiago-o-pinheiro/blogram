import { describe, expect, it } from 'vitest'

import { hasAiContext, toAiDraftRequest, toOfferedAiFields } from './to-ai-draft-request'

const FILE = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
const EMPTY = { title: '', altText: '', text: '' }
const MEDIA_ID = '6f1f2c0e-5b7a-4a52-9a43-2f1f5e0b9c11'

describe('toOfferedAiFields', () => {
  it.each([
    ['photo', true, ['title', 'altText', 'text']],
    ['photo', false, ['title', 'text']],
    ['video', true, ['title', 'altText', 'text']],
    ['youtube', true, ['title', 'text']],
    ['link', true, ['altText', 'text']],
    ['news', false, ['text']],
  ] as const)('Given a %s post with image %s, should offer %j', (postType, hasImage, expected) => {
    expect(toOfferedAiFields(postType, hasImage)).toEqual(expected)
  })
})

describe('toAiDraftRequest', () => {
  it('Given a title target with alt text present, should send no image', () => {
    const request = toAiDraftRequest({
      target: 'title',
      prompt: ' sunset ',
      postType: 'photo',
      values: { ...EMPTY, altText: 'A beach' },
      image: { file: FILE },
    })

    expect(request).toEqual({
      prompt: 'sunset',
      postType: 'photo',
      fields: ['title'],
      title: '',
      altText: 'A beach',
      text: '',
    })
  })

  it('Given the alt text target, should attach the file', () => {
    const request = toAiDraftRequest({
      target: 'altText',
      prompt: '',
      postType: 'photo',
      values: EMPTY,
      image: { file: FILE },
    })

    expect(request.fields).toEqual(['altText'])
    expect(request.file).toBe(FILE)
  })

  it('Given a saved image only, should send the media id instead of a file', () => {
    const request = toAiDraftRequest({
      target: 'altText',
      prompt: '',
      postType: 'photo',
      values: EMPTY,
      image: { file: null, mediaId: MEDIA_ID },
    })

    expect(request.mediaId).toBe(MEDIA_ID)
    expect(request.file).toBeUndefined()
  })

  it('Given a photo post with empty alt text, should attach the image for a caption', () => {
    const request = toAiDraftRequest({
      target: 'text',
      prompt: '',
      postType: 'photo',
      values: EMPTY,
      image: { file: FILE },
    })

    expect(request.file).toBe(FILE)
  })

  it('Given generate all, should request every offered field', () => {
    const request = toAiDraftRequest({
      target: 'all',
      prompt: 'x',
      postType: 'youtube',
      values: EMPTY,
      image: { file: null },
    })

    expect(request.fields).toEqual(['title', 'text'])
    expect(request.file).toBeUndefined()
  })

  it('Given a link post without an image, should not offer alt text', () => {
    const request = toAiDraftRequest({
      target: 'all',
      prompt: 'x',
      postType: 'link',
      values: { ...EMPTY, title: 'Link title' },
      image: { file: null },
    })

    expect(request.fields).toEqual(['text'])
    expect(request.title).toBe('Link title')
  })
})

describe('hasAiContext', () => {
  it('Given nothing at all, should be false', () => {
    expect(hasAiContext('  ', false, EMPTY)).toBe(false)
  })

  it.each([
    ['a prompt', 'hi', false, EMPTY],
    ['an image', '', true, EMPTY],
    ['a field value', '', false, { ...EMPTY, text: 'hello' }],
  ] as const)('Given %s, should be true', (_name, prompt, hasImage, values) => {
    expect(hasAiContext(prompt, hasImage, values)).toBe(true)
  })
})
