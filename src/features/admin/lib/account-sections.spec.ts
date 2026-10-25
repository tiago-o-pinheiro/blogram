import { describe, expect, it } from 'vitest'

import { ACCOUNT_SECTIONS, toAccountSection } from './account-sections'

describe('toAccountSection', () => {
  it.each(ACCOUNT_SECTIONS)('Given the %s section, should resolve to it', (section) => {
    expect(toAccountSection(section)).toBe(section)
  })

  it('Given no value, should fall back to security', () => {
    expect(toAccountSection(undefined)).toBe('security')
  })

  it('Given an unknown string, should fall back to security', () => {
    expect(toAccountSection('billing')).toBe('security')
  })

  it('Given a string array, should fall back to security', () => {
    expect(toAccountSection(['ai', 'data'])).toBe('security')
  })
})
