// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { db } from '@/server/lib/db'
import { account } from '@/server/modules/auth/schemas/auth.table'
import { authService } from '@/server/modules/auth/services/auth.service'
import { googleSettingsService } from '@/server/modules/auth/services/google-settings.service'
import { CREDENTIALS, postAuth } from '@/test/auth-session'

const SECRET = 'google-client-secret-value'

const saveSettings = (clientId: string, isEnabled = true) =>
  googleSettingsService.saveSettings({ isEnabled, clientId, clientSecret: SECRET })

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

describe('google provider built from saved settings', () => {
  it('Given saved enabled settings, should start Google sign-in with the saved client ID', async () => {
    await saveSettings('saved-client.apps.googleusercontent.com')

    const { response, body } = await startGoogleSignIn()

    expect(response.ok).toBe(true)
    expect(readClientId(body)).toBe('saved-client.apps.googleusercontent.com')
  })

  it('Given a changed client ID, should start Google sign-in with the new client ID', async () => {
    await saveSettings('first-client.apps.googleusercontent.com')
    await startGoogleSignIn()
    await saveSettings('second-client.apps.googleusercontent.com')

    const { body } = await startGoogleSignIn()

    expect(readClientId(body)).toBe('second-client.apps.googleusercontent.com')
  })

  it('Given Google sign-in disabled after being enabled, should not start Google sign-in', async () => {
    await saveSettings('saved-client.apps.googleusercontent.com')
    await startGoogleSignIn()
    await saveSettings('saved-client.apps.googleusercontent.com', false)

    const { response, body } = await startGoogleSignIn()

    expect(response.ok === false || readClientId(body) === null).toBe(true)
  })

  it('Given enabled stored settings and a linked Google account, should report sign-in enabled', async () => {
    const owner = await db.transaction((tx) =>
      authService.createOwner(tx, {
        identifier: CREDENTIALS.email,
        password: CREDENTIALS.password,
      }),
    )
    await saveSettings('saved-client.apps.googleusercontent.com')
    await db.insert(account).values({
      id: randomUUID(),
      providerId: 'google',
      accountId: 'google-subject',
      userId: owner.id,
    })

    expect(await authService.isGoogleSignInEnabled()).toBe(true)
  })
})
