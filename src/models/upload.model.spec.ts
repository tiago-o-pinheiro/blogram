import { Value } from 'typebox/value'
import { describe, expect, it } from 'vitest'

import {
  VideoReplacement,
  VideoUploadCompletion,
  VideoUploadStart,
  isVideoUploadReady,
  isVideoUploadSession,
} from './upload.model'

const ID = '3f2b8a6e-1c4d-4e5f-8a9b-0c1d2e3f4a5b'

describe('VideoUploadStart', () => {
  it('Given a supported type and size, should accept it', () => {
    expect(Value.Check(VideoUploadStart, { contentType: 'video/mp4', size: 10 })).toBe(true)
  })

  it('Given an unsupported type or zero size, should reject it', () => {
    expect(Value.Check(VideoUploadStart, { contentType: 'video/avi', size: 10 })).toBe(false)
    expect(Value.Check(VideoUploadStart, { contentType: 'video/mp4', size: 0 })).toBe(false)
  })
})

describe('isVideoUploadSession', () => {
  it('Given a valid session, should accept it', () => {
    const session = {
      id: ID,
      partSize: 10485760,
      parts: [{ partNumber: 1, url: 'https://bucket.example.com/a' }],
      expiresAt: '2026-10-25T10:00:00.000Z',
    }

    expect(isVideoUploadSession(session)).toBe(true)
  })

  it('Given a non-uuid id, should reject it', () => {
    expect(
      isVideoUploadSession({
        id: 'nope',
        partSize: 1,
        parts: [],
        expiresAt: '2026-10-25T10:00:00.000Z',
      }),
    ).toBe(false)
  })
})

describe('VideoUploadCompletion', () => {
  it('Given quoted and bare ETags, should accept them', () => {
    expect(
      Value.Check(VideoUploadCompletion, {
        parts: [
          { partNumber: 1, etag: '"abc123"' },
          { partNumber: 2, etag: 'abc-2' },
        ],
      }),
    ).toBe(true)
  })

  it('Given an ETag with markup characters, should reject it', () => {
    expect(Value.Check(VideoUploadCompletion, { parts: [{ partNumber: 1, etag: 'a<b' }] })).toBe(
      false,
    )
  })

  it('Given no parts, should reject it', () => {
    expect(Value.Check(VideoUploadCompletion, { parts: [] })).toBe(false)
  })
})

describe('VideoReplacement and ready uploads', () => {
  it('Given a uuid upload id, should accept the replacement', () => {
    expect(Value.Check(VideoReplacement, { uploadId: ID })).toBe(true)
    expect(Value.Check(VideoReplacement, { uploadId: 'x' })).toBe(false)
  })

  it('Given dimensions below one, should reject the ready upload', () => {
    const ready = { id: ID, contentType: 'video/webm', size: 5, width: 64, height: 96 }

    expect(isVideoUploadReady(ready)).toBe(true)
    expect(isVideoUploadReady({ ...ready, width: 0 })).toBe(false)
  })
})
