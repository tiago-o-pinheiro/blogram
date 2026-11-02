// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import NotFoundPage from './not-found'

const language = vi.hoisted(() => ({ value: 'en' }))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'accept-language': language.value }),
  cookies: async () => ({ get: () => undefined }),
}))

describe('NotFoundPage', () => {
  it('Given an English visitor, should explain the missing page and link home', async () => {
    language.value = 'en'

    const html = renderToStaticMarkup(await NotFoundPage())

    expect(html).toContain('We could not find that page')
    expect(html).toContain('href="/"')
  })

  it('Given a Spanish visitor, should show the missing page in Spanish', async () => {
    language.value = 'es-ES,es;q=0.9'

    const html = renderToStaticMarkup(await NotFoundPage())

    expect(html).toContain('No encontramos esa página')
    expect(html).toContain('Volver al inicio')
  })
})
