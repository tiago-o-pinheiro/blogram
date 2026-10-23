import { describe, expect, it } from 'vitest'

import { readCookie, serializeClearedCookie, serializeCookie } from './cookies'

describe('readCookie', () => {
  it('Given several cookies, should return the value of the named one', () => {
    const headers = new Headers({ cookie: 'a=1; blogram_setup=::token::; b=2' })

    expect(readCookie(headers, 'blogram_setup')).toBe('::token::')
  })

  it('Given no cookie header, should return null', () => {
    expect(readCookie(new Headers(), 'blogram_setup')).toBeNull()
  })

  it('Given a cookie whose name only ends the same way, should not match it', () => {
    const headers = new Headers({ cookie: 'x_blogram_setup=::token::' })

    expect(readCookie(headers, 'blogram_setup')).toBeNull()
  })
})

describe('serializeCookie', () => {
  it('Given a value, should be httpOnly, lax, scoped to the root and expiring', () => {
    const cookie = serializeCookie('blogram_setup', '::token::', {
      maxAgeSeconds: 60,
      isSecure: false,
    })

    expect(cookie).toBe('blogram_setup=::token::; Path=/; HttpOnly; SameSite=Lax; Max-Age=60')
  })

  it('Given a secure context, should add the Secure flag', () => {
    const cookie = serializeCookie('blogram_setup', '::token::', {
      maxAgeSeconds: 60,
      isSecure: true,
    })

    expect(cookie).toContain('; Secure')
  })
})

describe('serializeClearedCookie', () => {
  it('Given a name, should empty the value and expire it now', () => {
    const cookie = serializeClearedCookie('blogram_setup', false)

    expect(cookie).toContain('blogram_setup=;')
    expect(cookie).toContain('Max-Age=0')
    expect(cookie).toContain('HttpOnly')
  })
})
