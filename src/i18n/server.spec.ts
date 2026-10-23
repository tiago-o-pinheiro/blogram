// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { profileService } from '@/server/modules/profile/services/profile.service'

import { getServerLocale } from './server'

const requestState = vi.hoisted(
  (): { cookie: string | undefined; acceptLanguage: string | null } => ({
    cookie: undefined,
    acceptLanguage: null,
  }),
)

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'blogram_locale' && requestState.cookie !== undefined
        ? { name, value: requestState.cookie }
        : undefined,
  }),
  headers: async () => {
    const headerStore = new Headers()
    if (requestState.acceptLanguage !== null) {
      headerStore.set('accept-language', requestState.acceptLanguage)
    }
    return headerStore
  },
}))

afterEach(() => {
  requestState.cookie = undefined
  requestState.acceptLanguage = null
  vi.restoreAllMocks()
})

describe('getServerLocale', () => {
  it('Given no cookie and no supported Accept-Language, should use the owner site default', async () => {
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'es' })
    requestState.acceptLanguage = 'fr,de;q=0.8'

    await expect(getServerLocale()).resolves.toBe('es')
  })

  it('Given a supported Accept-Language, should prefer it over the site default', async () => {
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'es' })
    requestState.acceptLanguage = 'en-US,en;q=0.9'

    await expect(getServerLocale()).resolves.toBe('en')
  })

  it('Given a locale cookie, should prefer it over the site default', async () => {
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'es' })
    requestState.cookie = 'en'

    await expect(getServerLocale()).resolves.toBe('en')
  })
})
