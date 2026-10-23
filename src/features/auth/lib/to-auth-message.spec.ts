import { describe, expect, it } from 'vitest'

import { toSignInMessage, toSignUpMessage } from './to-auth-message'

describe('toSignInMessage', () => {
  it('Given a 401 status, should say the credentials are wrong', () => {
    expect(toSignInMessage(401)).toBe('Wrong email or password.')
  })

  it('Given any other status, should return the generic message', () => {
    expect(toSignInMessage(500)).toBe('We could not sign you in. Try again.')
  })
})

describe('toSignUpMessage', () => {
  it('Given a 422 status, should say the account already exists', () => {
    expect(toSignUpMessage(422)).toBe('An account with this email already exists.')
  })

  it('Given any other status, should return the generic message', () => {
    expect(toSignUpMessage(0)).toBe('We could not create your account. Try again.')
  })
})
