// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { googleSettingsService } from '@/server/modules/auth/services/google-settings.service'
import { postAuth } from '@/test/auth-session'

const startGoogleSignIn = async () => {
  const response = await postAuth(
    '/sign-in/social',
    { provider: 'google', callbackURL: '/' },
    { origin: 'http://localhost:3000' },
  )
  const body: unknown = await response.json().catch(() => null)
  return { response, body }
}

const readClientId = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null || !('url' in body)) {
    return null
  }
  return typeof body.url === 'string' ? new URL(body.url).searchParams.get('client_id') : null
}

describe('google provider cache key', () => {
  it('BH-1: Given a client ID and secret change whose concatenation is unchanged, should start Google sign-in with the new client ID', async () => {
    await googleSettingsService.saveSettings({
      isEnabled: true,
      clientId: 'client-one',
      clientSecret: 'x-secret-value',
    })
    await startGoogleSignIn()

    await googleSettingsService.saveSettings({
      isEnabled: true,
      clientId: 'client-on',
      clientSecret: 'ex-secret-value',
    })
    const { response, body } = await startGoogleSignIn()

    expect(response.ok).toBe(true)
    expect(readClientId(body)).toBe('client-on')
  })
})
