import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN } from './owner-password.mjs'
import { Profile } from './profile.model'

export { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN }

const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/
const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/

export const SetupUnlock = Type.Object({
  password: Type.String({ minLength: 1, maxLength: 256 }),
})
export type SetupUnlock = Static<typeof SetupUnlock>

export const SetupOwner = Type.Object({
  identifier: Type.String({ minLength: 3, maxLength: 254 }),
  password: Type.String({ minLength: OWNER_PASSWORD_MIN, maxLength: OWNER_PASSWORD_MAX }),
  passwordConfirmation: Type.String({ minLength: 1, maxLength: OWNER_PASSWORD_MAX }),
})
export type SetupOwner = Static<typeof SetupOwner>

export const SetupState = Type.Object({
  status: Type.Union([Type.Literal('pending'), Type.Literal('completed')]),
  isConfigured: Type.Boolean(),
  isUnlocked: Type.Boolean(),
  profile: Type.Union([Profile, Type.Null()]),
})
export type SetupState = Static<typeof SetupState>

export type OwnerIdentifier = { kind: 'email' | 'username'; value: string }

export const toOwnerIdentifier = (value: string): OwnerIdentifier | null => {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.includes('@')) {
    return EMAIL_PATTERN.test(trimmed) ? { kind: 'email', value: trimmed } : null
  }
  return USERNAME_PATTERN.test(trimmed) ? { kind: 'username', value: trimmed } : null
}

export const isSetupUnlock = (value: unknown): value is SetupUnlock =>
  Value.Check(SetupUnlock, value)

export const isSetupOwner = (value: unknown): value is SetupOwner => Value.Check(SetupOwner, value)

export const isSetupState = (value: unknown): value is SetupState => Value.Check(SetupState, value)

export const hasMatchingPasswords = (owner: SetupOwner): boolean =>
  owner.password === owner.passwordConfirmation
