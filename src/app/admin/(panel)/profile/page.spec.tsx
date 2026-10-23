import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { authService } from '@/server/modules/auth/services/auth.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

import Page from './page'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.spyOn(authService, 'findUser').mockResolvedValue({
    id: '::owner-id::',
    name: '::name::',
    email: 'owner@example.test',
  })
})

describe('Admin profile page', () => {
  it('Given a stored profile and settings, should render both forms with their values', async () => {
    vi.spyOn(profileService, 'getProfile').mockResolvedValue({
      name: 'Ada Lovelace',
      description: 'Analyst',
      hasPhoto: false,
    })
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'es' })

    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        {await Page()}
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText('Default site language')).toHaveValue('es')
  })

  it('Given no stored profile, should respond with not found', async () => {
    vi.spyOn(profileService, 'getProfile').mockResolvedValue(null)
    vi.spyOn(profileService, 'getSettings').mockResolvedValue({ defaultLocale: 'en' })

    await expect(Page()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
