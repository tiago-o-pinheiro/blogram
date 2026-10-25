import { describe, expect, it } from 'vitest'

import robots from './robots'

describe('robots', () => {
  it('Given the robots file, should allow public pages and disallow private paths', () => {
    const { rules } = robots()
    const rule = Array.isArray(rules) ? rules[0] : rules

    expect(rule?.allow).toBe('/')
    expect(rule?.disallow).toEqual([
      '/admin',
      '/sign-in',
      '/api/admin',
      '/api/setup',
      '/api/auth',
      '/api/me',
    ])
  })

  it('Given the robots file, should point at the sitemap', () => {
    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml')
  })
})
