import { describe, expect, it } from 'vitest'

import { toSetupMessageKey } from './to-setup-message'

describe('toSetupMessageKey', () => {
  it.each([
    [401, 'errors.setup.unauthorized'],
    [403, 'errors.setup.forbidden'],
    [413, 'errors.setup.tooLarge'],
    [422, 'errors.setup.invalid'],
    [429, 'errors.setup.tooMany'],
    [503, 'errors.setup.unavailable'],
  ])('Given status %i, should return %s', (status, key) => {
    expect(toSetupMessageKey(status)).toBe(key)
  })

  it('Given an unmapped status, should return the generic key', () => {
    expect(toSetupMessageKey(500)).toBe('errors.setup.generic')
  })
})
