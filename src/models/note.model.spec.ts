import { describe, expect, it } from 'vitest'

import { isNote } from './note.model'

describe('Note', () => {
  it('Given a complete note payload, should recognise it', () => {
    const payload = {
      id: '3f2b8c1e-5d4a-4b6e-9a7c-1d2e3f4a5b6c',
      title: '::title::',
      body: '::body::',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(isNote(payload)).toBe(true)
  })

  it('Given a note with an empty title, should reject it', () => {
    const payload = {
      id: '3f2b8c1e-5d4a-4b6e-9a7c-1d2e3f4a5b6c',
      title: '',
      body: '::body::',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(isNote(payload)).toBe(false)
  })

  it('Given a note with a malformed id, should reject it', () => {
    const payload = {
      id: '::id::',
      title: '::title::',
      body: '::body::',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(isNote(payload)).toBe(false)
  })
})
