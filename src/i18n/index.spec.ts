import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, getMessages, isLocale, SUPPORTED_LOCALES, t } from './index'

describe('i18n', () => {
  it('Given a known key, should return the english message', () => {
    expect(t('common.retry')).toBe('Retry')
  })

  it('Given a supported locale, should accept it', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('es')).toBe(true)
  })

  it('Given an unsupported value, should reject it', () => {
    expect(isLocale('xx')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it('Given the default locale, should be a supported one', () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE)
  })

  it('Given en and es messages, should have identical key sets', () => {
    expect(Object.keys(getMessages('es')).sort()).toEqual(Object.keys(getMessages('en')).sort())
  })

  it('Given the es locale, should return spanish messages', () => {
    expect(getMessages('es')['common.retry']).toBe('Reintentar')
  })

  it('Given any locale, should have no empty message', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      Object.values(getMessages(locale)).forEach((message) => {
        expect(message.length).toBeGreaterThan(0)
      })
    })
  })
})
