import { describe, expect, it } from 'vitest'

import {
  PROFILE_DESCRIPTION_MAX,
  PROFILE_NAME_MAX,
  isProfile,
  isProfileBundle,
} from './profile.model'

describe('ProfileBundle', () => {
  it('Given a name and an empty description, should recognise it', () => {
    expect(isProfileBundle({ name: '::name::', description: '' })).toBe(true)
  })

  it('Given an empty name, should reject it', () => {
    expect(isProfileBundle({ name: '', description: '' })).toBe(false)
  })

  it('Given a name above the maximum, should reject it', () => {
    const name = 'x'.repeat(PROFILE_NAME_MAX + 1)

    expect(isProfileBundle({ name, description: '' })).toBe(false)
  })

  it('Given a description at the maximum, should accept it, and above it reject it', () => {
    const atMax = 'x'.repeat(PROFILE_DESCRIPTION_MAX)

    expect(isProfileBundle({ name: '::name::', description: atMax })).toBe(true)
    expect(isProfileBundle({ name: '::name::', description: `${atMax}x` })).toBe(false)
  })
})

describe('Profile', () => {
  it('Given a profile with the photo flag, should recognise it', () => {
    expect(isProfile({ name: '::name::', description: '', hasPhoto: true })).toBe(true)
  })

  it('Given a profile without the photo flag, should reject it', () => {
    expect(isProfile({ name: '::name::', description: '' })).toBe(false)
  })
})
