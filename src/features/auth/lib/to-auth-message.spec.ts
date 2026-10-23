import { describe, expect, it } from 'vitest'

import { toSignInMessageKey } from './to-auth-message'

describe('toSignInMessageKey', () => {
  it('Given a 401 status, should return the invalid credentials key', () => {
    expect(toSignInMessageKey(401)).toBe('signin.errors.invalid')
  })

  it('Given any other status, should return the generic key', () => {
    expect(toSignInMessageKey(500)).toBe('signin.errors.generic')
  })
})
