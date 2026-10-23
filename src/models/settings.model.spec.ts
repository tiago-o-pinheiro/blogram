import { describe, expect, it } from 'vitest'

import { SUPPORTED_LOCALES } from '@/i18n'

import { LOCALES, isSiteSettings } from './settings.model'

describe('SiteSettings', () => {
  it('Given the model locales, should equal the supported i18n locales', () => {
    expect([...LOCALES]).toEqual([...SUPPORTED_LOCALES])
  })

  it('Given a supported default locale, should recognise it', () => {
    expect(isSiteSettings({ defaultLocale: 'es' })).toBe(true)
  })

  it('Given an unsupported default locale, should reject it', () => {
    expect(isSiteSettings({ defaultLocale: 'fr' })).toBe(false)
  })
})
