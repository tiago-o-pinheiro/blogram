import { afterEach, describe, expect, it, vi } from 'vitest'

import { GoogleSettingsApiError, saveGoogleSettings } from './google-settings-api'

const SETTINGS = {
  source: 'settings',
  isEnabled: true,
  clientId: 'abc.apps.googleusercontent.com',
  hasClientSecret: true,
  redirectUri: 'https://blog.example/api/auth/callback/google',
} as const

const UPDATE = { isEnabled: true, clientId: 'abc.apps.googleusercontent.com' }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saveGoogleSettings', () => {
  it('Given a valid answer, should return the settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SETTINGS))

    await expect(saveGoogleSettings(UPDATE)).resolves.toEqual(SETTINGS)
  })

  it('Given a 409 with a reason, should throw an error carrying both', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ details: { reason: 'google-managed-by-env' } }, { status: 409 }),
    )

    const failure = await saveGoogleSettings(UPDATE).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(GoogleSettingsApiError)
    expect(failure).toMatchObject({ status: 409, reason: 'google-managed-by-env' })
  })

  it('Given a malformed answer, should throw a GoogleSettingsApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ nope: true }))

    await expect(saveGoogleSettings(UPDATE)).rejects.toBeInstanceOf(GoogleSettingsApiError)
  })
})
