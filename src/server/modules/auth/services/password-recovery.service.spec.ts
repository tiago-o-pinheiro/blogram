import { betterAuth } from 'better-auth'
import { eq } from 'drizzle-orm'
import { Type } from 'typebox'
import { Value } from 'typebox/value'
import { describe, expect, it, vi } from 'vitest'

import { createAuth } from '@/server/lib/auth'
import { db } from '@/server/lib/db'
import { session, verification } from '@/server/modules/auth/schemas/auth.table'
import { CREDENTIALS, createOwnerSession, signIn } from '@/test/auth-session'

import { PasswordRecoveryService } from './password-recovery.service'

const CONFIG = {
  RESEND_API_KEY: '::resend-key::',
  PASSWORD_RESET_FROM: 'Blogram <access@example.test>',
}
const NEW_PASSWORD = '::new-password::'
const EMAIL = Type.Object({ text: Type.String(), to: Type.Array(Type.String()) })

const post = (path: string, body: unknown) =>
  new Request(`http://localhost:3000/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  })

const setupRecovery = () => {
  const delivery = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: '::id::' }))
  const auth = createAuth(null, new PasswordRecoveryService(CONFIG))
  const requestReset = (email = CREDENTIALS.email) =>
    auth.handler(post('/request-password-reset', { email, redirectTo: '/reset-password' }))
  const readLink = () => {
    const email = Value.Decode(EMAIL, JSON.parse(String(delivery.mock.calls[0]?.[1]?.body)))
    return new URL(email.text.split('\n\n')[2] ?? '')
  }
  return { delivery, auth, requestReset, readLink }
}

describe('Password recovery', () => {
  it('Given an owner email, should reset access without Google and close previous sessions', async () => {
    const cookie = await createOwnerSession()
    const { auth, requestReset, readLink } = setupRecovery()

    const requested = await requestReset()
    const callback = await auth.handler(new Request(readLink()))
    const destination = new URL(callback.headers.get('location') ?? '')
    const token = destination.searchParams.get('token') ?? ''
    const response = await auth.handler(
      post('/reset-password', { token, newPassword: NEW_PASSWORD }),
    )

    expect(requested.status).toBe(200)
    expect(destination.pathname).toBe('/reset-password')
    expect(response.status).toBe(200)
    expect(await db.select({ id: session.id }).from(session)).toHaveLength(0)
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull()
    expect((await signIn()).status).toBe(401)
    expect((await signIn({ ...CREDENTIALS, password: NEW_PASSWORD })).status).toBe(200)
    expect(
      (await auth.handler(post('/reset-password', { token, newPassword: '::another::' }))).status,
    ).toBe(400)
  })

  it('Given an unknown email, should show the same confirmation without sending email', async () => {
    await createOwnerSession()
    const { delivery, requestReset } = setupRecovery()

    const unknown = await requestReset('unknown@example.test')
    expect(delivery).not.toHaveBeenCalled()
    const known = await requestReset()

    expect(unknown.status).toBe(200)
    expect(await unknown.json()).toEqual(await known.json())
  })

  it('Given a username account, should avoid sending email to its internal address', async () => {
    await createOwnerSession({ ...CREDENTIALS, email: 'owner.name' })
    const { delivery, requestReset } = setupRecovery()

    const response = await requestReset('owner.name@owner.invalid')

    expect(response.status).toBe(200)
    expect(delivery).not.toHaveBeenCalled()
  })

  it('Given an expired link, should refuse the reset and preserve the password', async () => {
    await createOwnerSession()
    const { auth, requestReset, readLink } = setupRecovery()
    await requestReset()
    const token = readLink().pathname.split('/').at(-1) ?? ''
    const [stored] = await db.select().from(verification)
    expect(stored?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000)
    expect(stored?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000)
    await db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verification.identifier, `reset-password:${token}`))

    const response = await auth.handler(
      post('/reset-password', { token, newPassword: NEW_PASSWORD }),
    )
    const callback = await auth.handler(new Request(readLink()))

    expect(response.status).toBe(400)
    expect(callback.headers.get('location')).toContain('error=INVALID_TOKEN')
    expect((await signIn()).status).toBe(200)
  })

  it.each(['', '::invalid-token::'])(
    'Given an invalid recovery token, should preserve the password',
    async (token) => {
      await createOwnerSession()
      const { auth } = setupRecovery()

      const response = await auth.handler(
        post('/reset-password', { token, newPassword: NEW_PASSWORD }),
      )

      expect(response.status).toBe(400)
      expect((await signIn()).status).toBe(200)
    },
  )

  it.each(['', 'x'.repeat(129)])(
    'Given an invalid new password, should preserve the credential and recovery link',
    async (newPassword) => {
      await createOwnerSession()
      const { auth, requestReset, readLink } = setupRecovery()
      await requestReset()
      const token = readLink().pathname.split('/').at(-1) ?? ''

      const response = await auth.handler(post('/reset-password', { token, newPassword }))

      expect(response.status).toBe(400)
      expect((await signIn()).status).toBe(200)
      expect(
        (await auth.handler(post('/reset-password', { token, newPassword: NEW_PASSWORD }))).status,
      ).toBe(200)
    },
  )

  it('Given an untrusted redirect, should refuse recovery without sending email', async () => {
    await createOwnerSession()
    const { auth, delivery } = setupRecovery()
    const secureAuth = betterAuth({
      ...auth.options,
      advanced: { ...auth.options.advanced, disableOriginCheck: false },
    })

    const response = await secureAuth.handler(
      post('/request-password-reset', {
        email: CREDENTIALS.email,
        redirectTo: 'https://untrusted.example/reset-password',
      }),
    )

    expect(response.status).toBe(403)
    expect(delivery).not.toHaveBeenCalled()
  })

  it('Given no email configuration, should disable email recovery', async () => {
    const auth = createAuth(null, new PasswordRecoveryService({}))

    const response = await auth.handler(
      post('/request-password-reset', { email: CREDENTIALS.email }),
    )

    expect(response.status).toBe(400)
  })

  it.each([400, 429, 500])(
    'Given a mail delivery failure, should report recovery unavailable',
    async (status) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status }))
      const recovery = new PasswordRecoveryService(CONFIG)

      await expect(
        recovery.sendResetPassword({ user: { email: CREDENTIALS.email }, url: '::reset-url::' }),
      ).rejects.toThrow('Password recovery email could not be sent')
    },
  )

  it('Given an offline mail provider, should report recovery unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))
    const recovery = new PasswordRecoveryService(CONFIG)

    await expect(
      recovery.sendResetPassword({ user: { email: CREDENTIALS.email }, url: '::reset-url::' }),
    ).rejects.toThrow('Password recovery email could not be sent')
  })
})
