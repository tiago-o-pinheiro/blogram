import { describe, expect, it } from 'vitest'

import { metadata } from './layout'

describe('root layout metadata', () => {
  it('Given any public page, should advertise the RSS feed in the head', () => {
    expect(metadata.alternates?.types).toEqual({ 'application/rss+xml': '/feed.xml' })
  })

  it('Given any public page, should resolve relative URLs against the site origin', () => {
    expect(new URL(metadata.metadataBase ?? '').origin).toBe('http://localhost:3000')
  })
})
