import { Value } from 'typebox/value'
import { describe, expect, it } from 'vitest'

import {
  GOOGLE_CLIENT_ID_MAX,
  GOOGLE_CLIENT_SECRET_MAX,
  GoogleSignInSettingsUpdate,
  isGoogleSignInSettings,
} from './google.model'

const validUpdate = { isEnabled: true, clientId: 'abc.apps-1_x', clientSecret: 'secret' }
const validSettings = {
  source: 'settings',
  isEnabled: false,
  clientId: '',
  hasClientSecret: false,
  redirectUri: 'https://blog.example/api/auth/callback/google',
}

describe('GoogleSignInSettingsUpdate', () => {
  it('Given a client ID and secret, should accept it', () => {
    expect(Value.Check(GoogleSignInSettingsUpdate, validUpdate)).toBe(true)
  })

  it('Given no secret, should accept it', () => {
    expect(Value.Check(GoogleSignInSettingsUpdate, { isEnabled: true, clientId: 'abc' })).toBe(true)
  })

  it('Given an empty client ID, should accept it', () => {
    expect(Value.Check(GoogleSignInSettingsUpdate, { ...validUpdate, clientId: '' })).toBe(true)
  })

  it('Given a client ID with spaces, should reject it', () => {
    expect(Value.Check(GoogleSignInSettingsUpdate, { ...validUpdate, clientId: 'a b' })).toBe(false)
  })

  it('Given a client ID above the maximum, should reject it', () => {
    const clientId = 'a'.repeat(GOOGLE_CLIENT_ID_MAX + 1)
    expect(Value.Check(GoogleSignInSettingsUpdate, { ...validUpdate, clientId })).toBe(false)
  })

  it('Given an empty secret, should reject it', () => {
    expect(Value.Check(GoogleSignInSettingsUpdate, { ...validUpdate, clientSecret: '' })).toBe(
      false,
    )
  })

  it('Given a secret above the maximum, should reject it', () => {
    const clientSecret = 'a'.repeat(GOOGLE_CLIENT_SECRET_MAX + 1)
    expect(Value.Check(GoogleSignInSettingsUpdate, { ...validUpdate, clientSecret })).toBe(false)
  })

  it('Given a missing flag, should reject it', () => {
    expect(Value.Check(GoogleSignInSettingsUpdate, { clientId: 'abc' })).toBe(false)
  })
})

describe('isGoogleSignInSettings', () => {
  it('Given valid settings, should accept them', () => {
    expect(isGoogleSignInSettings(validSettings)).toBe(true)
  })

  it('Given an unknown source, should reject it', () => {
    expect(isGoogleSignInSettings({ ...validSettings, source: 'file' })).toBe(false)
  })

  it('Given a non-object, should reject it', () => {
    expect(isGoogleSignInSettings(null)).toBe(false)
  })
})
