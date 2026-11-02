import { describe, expect, it, vi } from 'vitest'

import { generateMetadata } from './layout'

const language = vi.hoisted(() => ({ value: 'en' }))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'accept-language': language.value }),
  cookies: async () => ({ get: () => undefined }),
}))

describe('root layout metadata', () => {
  it('Given any public page, should advertise the RSS feed in the head', async () => {
    const metadata = await generateMetadata()

    expect(metadata.alternates?.types).toEqual({ 'application/rss+xml': '/feed.xml' })
  })

  it('Given any public page, should resolve relative URLs against the site origin', async () => {
    const metadata = await generateMetadata()

    expect(new URL(metadata.metadataBase ?? '').origin).toBe('http://localhost:3000')
  })

  it('Given a Spanish visitor, should describe the site in Spanish', async () => {
    language.value = 'es'

    const metadata = await generateMetadata()

    expect(metadata.description).toBe('Un diario multimedia personal')
  })
})
