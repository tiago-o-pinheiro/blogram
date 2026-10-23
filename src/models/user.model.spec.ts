import { describe, expect, it } from 'vitest'

import { isUser } from './user.model'

describe('User', () => {
  it('Given a complete user payload, should recognise it', () => {
    const payload = { id: '::id::', name: '::name::', email: 'member@example.test' }

    expect(isUser(payload)).toBe(true)
  })

  it('Given a payload with an empty name, should reject it', () => {
    const payload = { id: '::id::', name: '', email: 'member@example.test' }

    expect(isUser(payload)).toBe(false)
  })

  it('Given a payload without an id, should reject it', () => {
    const payload = { name: '::name::', email: 'member@example.test' }

    expect(isUser(payload)).toBe(false)
  })
})
