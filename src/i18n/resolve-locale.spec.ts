import { describe, expect, it } from 'vitest'

import { resolveLocale } from './resolve-locale'

describe('resolveLocale', () => {
  it('Given a valid cookie, should prefer it over Accept-Language', () => {
    expect(resolveLocale({ cookie: 'es', acceptLanguage: 'en' })).toBe('es')
  })

  it('Given an invalid cookie, should fall back to Accept-Language', () => {
    expect(resolveLocale({ cookie: 'xx', acceptLanguage: 'es-ES,es;q=0.9' })).toBe('es')
  })

  it('Given q-values, should pick the highest supported one', () => {
    expect(resolveLocale({ acceptLanguage: 'fr;q=0.9,es;q=0.8,en;q=0.5' })).toBe('es')
    expect(resolveLocale({ acceptLanguage: 'es;q=0.2,en;q=0.7' })).toBe('en')
  })

  it('Given a regional tag, should match its language', () => {
    expect(resolveLocale({ acceptLanguage: 'es-MX' })).toBe('es')
  })

  it('Given a zero q-value, should skip that language', () => {
    expect(resolveLocale({ acceptLanguage: 'es;q=0,en;q=0.1' })).toBe('en')
  })

  it('Given nothing supported, should default to en', () => {
    expect(resolveLocale({ acceptLanguage: 'fr,de;q=0.8' })).toBe('en')
    expect(resolveLocale({ cookie: null, acceptLanguage: null })).toBe('en')
    expect(resolveLocale({})).toBe('en')
  })

  it('Given a cookie and a site default, should prefer the cookie', () => {
    expect(resolveLocale({ cookie: 'en', siteDefault: 'es' })).toBe('en')
  })

  it('Given a supported Accept-Language and a site default, should prefer the header', () => {
    expect(resolveLocale({ acceptLanguage: 'en-US', siteDefault: 'es' })).toBe('en')
  })

  it('Given no cookie and no supported Accept-Language, should use the site default', () => {
    expect(resolveLocale({ acceptLanguage: 'fr,de;q=0.8', siteDefault: 'es' })).toBe('es')
    expect(resolveLocale({ siteDefault: 'es' })).toBe('es')
  })

  it('Given an unsupported site default, should default to en', () => {
    expect(resolveLocale({ siteDefault: 'fr' })).toBe('en')
  })

  it('Given a malformed header, should default to en', () => {
    expect(resolveLocale({ acceptLanguage: ';q=abc,,' })).toBe('en')
  })
})
