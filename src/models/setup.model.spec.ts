import { describe, expect, it } from 'vitest'

import {
  OWNER_PASSWORD_MAX,
  OWNER_PASSWORD_MIN,
  hasMatchingPasswords,
  isSetupOwner,
  isSetupState,
  isSetupUnlock,
  toOwnerIdentifier,
} from './setup.model'

const toOwner = (overrides: Record<string, unknown> = {}) => ({
  identifier: 'owner@example.test',
  password: 'a-long-enough-password',
  passwordConfirmation: 'a-long-enough-password',
  ...overrides,
})

describe('toOwnerIdentifier', () => {
  it('Given a value with an at sign, should return an email identifier', () => {
    expect(toOwnerIdentifier('Owner@Example.test')).toEqual({
      kind: 'email',
      value: 'owner@example.test',
    })
  })

  it('Given a plain handle, should return a username identifier', () => {
    expect(toOwnerIdentifier('the.owner_1')).toEqual({ kind: 'username', value: 'the.owner_1' })
  })

  it('Given a malformed email, should return null', () => {
    expect(toOwnerIdentifier('owner@')).toBeNull()
  })

  it('Given a username that is too short or has invalid characters, should return null', () => {
    expect(toOwnerIdentifier('ab')).toBeNull()
    expect(toOwnerIdentifier('has space')).toBeNull()
  })
})

describe('SetupOwner', () => {
  it('Given a valid owner, should recognise it', () => {
    expect(isSetupOwner(toOwner())).toBe(true)
  })

  it('Given a password below the minimum length, should reject it', () => {
    const password = 'x'.repeat(OWNER_PASSWORD_MIN - 1)

    expect(isSetupOwner(toOwner({ password }))).toBe(false)
  })

  it('Given a password above the maximum length, should reject it', () => {
    const password = 'x'.repeat(OWNER_PASSWORD_MAX + 1)

    expect(isSetupOwner(toOwner({ password }))).toBe(false)
  })

  it('Given a password at the bounds, should accept it', () => {
    expect(isSetupOwner(toOwner({ password: 'x'.repeat(OWNER_PASSWORD_MIN) }))).toBe(true)
    expect(
      isSetupOwner(
        toOwner({
          password: 'x'.repeat(OWNER_PASSWORD_MAX),
          passwordConfirmation: 'x'.repeat(OWNER_PASSWORD_MAX),
        }),
      ),
    ).toBe(true)
  })

  it('Given a different confirmation, should report a mismatch', () => {
    expect(hasMatchingPasswords(toOwner({ passwordConfirmation: 'other-password-123' }))).toBe(
      false,
    )
    expect(hasMatchingPasswords(toOwner())).toBe(true)
  })
})

describe('SetupUnlock', () => {
  it('Given an empty password, should reject it', () => {
    expect(isSetupUnlock({ password: '' })).toBe(false)
  })

  it('Given a password, should recognise it', () => {
    expect(isSetupUnlock({ password: '::password::' })).toBe(true)
  })
})

describe('SetupState', () => {
  it('Given a pending state without a profile, should recognise it', () => {
    const state = { status: 'pending', isConfigured: true, isUnlocked: false, profile: null }

    expect(isSetupState(state)).toBe(true)
  })

  it('Given an unknown status, should reject it', () => {
    const state = { status: 'other', isConfigured: true, isUnlocked: false, profile: null }

    expect(isSetupState(state)).toBe(false)
  })
})
