import { describe, expect, it } from 'vitest'

import { toClientKey } from './client-key'

describe('toClientKey', () => {
  it('Given a Cloudflare client address, should prefer it over forwarded entries', () => {
    const headers = new Headers({ 'cf-connecting-ip': '::cf::', 'x-forwarded-for': '::spoofed::' })

    expect(toClientKey(headers)).toBe('::cf::')
  })

  it('Given a forwarded chain, should use the entry appended by the nearest proxy', () => {
    const headers = new Headers({ 'x-forwarded-for': '::spoofed::, ::proxy-seen::' })

    expect(toClientKey(headers)).toBe('::proxy-seen::')
  })

  it('Given no client headers, should fall back to a shared key', () => {
    expect(toClientKey(new Headers())).toBe('unknown')
  })
})
