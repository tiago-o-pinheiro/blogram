import { randomUUID } from 'node:crypto'

import { betterAuth } from 'better-auth'
import { and, count, eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'

import { auth } from '@/server/lib/auth'
import { db } from '@/server/lib/db'
import { account, session, user } from '@/server/modules/auth/schemas/auth.table'
import { authService } from '@/server/modules/auth/services/auth.service'

vi.hoisted(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret')
})

const PASSWORD = 'owner-password-123456789'
const GOOGLE_SUBJECT = 'verified-google-subject'

const createOwner = () =>
  db.transaction((tx) =>
    authService.createOwner(tx, { identifier: 'owner@example.test', password: PASSWORD }),
  )

const suppliedProvider = (email: string, subject = GOOGLE_SUBJECT) => {
  const google = auth.options.socialProviders.google
  if (!google) {
    throw new TypeError('Google must be configured for provider profile tests')
  }
  return betterAuth({
    ...auth.options,
    socialProviders: {
      google: {
        ...google,
        verifyIdToken: async () => true,
        getUserInfo: async () => ({
          user: { name: 'Google owner', email, emailVerified: true },
          data: {
            sub: subject,
            aud: 'test-client-id',
            azp: 'test-client-id',
            email,
            email_verified: true,
            exp: Math.floor(Date.now() / 1000) + 3600,
            family_name: 'Owner',
            given_name: 'Google',
            iat: Math.floor(Date.now() / 1000),
            iss: 'https://accounts.google.com',
            name: 'Google owner',
            picture: '',
          },
        }),
      },
    },
  })
}

const post = (path: string, body: unknown, cookie = '') =>
  new Request(`http://localhost:3000/api/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', cookie },
    body: JSON.stringify(body),
  })

const signInGoogle = (provider: ReturnType<typeof suppliedProvider>, requestSignUp = false) =>
  provider.handler(
    post('sign-in/social', {
      provider: 'google',
      idToken: { token: 'supplied-provider-token' },
      requestSignUp,
    }),
  )

const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((entry) => entry.split(';')[0])
    .join('; ')

describe('Google authentication with supplied verified provider profiles', () => {
  it('Given a verified Google email matching the owner, should reject implicit linking', async () => {
    await createOwner()

    const response = await signInGoogle(suppliedProvider('owner@example.test'))

    expect(response.ok).toBe(false)
    expect(await response.text()).toMatch(/not.linked/i)
    const [row] = await db
      .select({ total: count() })
      .from(account)
      .where(eq(account.providerId, 'google'))
    expect(row?.total).toBe(0)
  })

  it('Given an unrecognized Google identity requesting signup, should create no user or session', async () => {
    const response = await signInGoogle(suppliedProvider('stranger@example.test'), true)

    expect(response.ok).toBe(false)
    const [row] = await db.select({ total: count() }).from(user)
    expect(row?.total).toBe(0)
  })

  it('Given a Google subject explicitly linked to the owner, should sign in despite a changed provider email', async () => {
    const owner = await createOwner()
    await db.insert(account).values({
      id: randomUUID(),
      providerId: 'google',
      accountId: GOOGLE_SUBJECT,
      userId: owner.id,
    })

    const response = await signInGoogle(suppliedProvider('changed@example.test'))

    expect(response.ok).toBe(true)
    expect(cookieOf(response)).toContain('session_token=')
    expect((await authService.findUser(new Headers({ cookie: cookieOf(response) })))?.id).toBe(
      owner.id,
    )
  })

  it('Given a different Google subject with the same email, should deny access to the linked account', async () => {
    const owner = await createOwner()
    await db.insert(account).values({
      id: randomUUID(),
      providerId: 'google',
      accountId: GOOGLE_SUBJECT,
      userId: owner.id,
    })

    const response = await signInGoogle(suppliedProvider('owner@example.test', 'another-subject'))

    expect(response.ok).toBe(false)
  })

  it('Given no session, should deny explicit linking', async () => {
    expect(
      (
        await suppliedProvider('owner@example.test').handler(
          post('link-social', { provider: 'google' }),
        )
      ).status,
    ).toBe(401)
  })

  it('Given a recent owner session, should explicitly link a verified Google identity without replacing password access', async () => {
    const owner = await createOwner()
    const cookie = cookieOf(await authService.signInOwner('owner@example.test', PASSWORD))

    const response = await suppliedProvider('different@example.test').handler(
      post(
        'link-social',
        { provider: 'google', idToken: { token: 'supplied-provider-token' } },
        cookie,
      ),
    )

    expect(response.ok).toBe(true)
    const [linked] = await db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.providerId, 'google'), eq(account.userId, owner.id)))
    expect(linked?.accountId).toBe(GOOGLE_SUBJECT)
    expect((await authService.signInOwner('owner@example.test', PASSWORD)).ok).toBe(true)
  })

  it('Given an old session, should require a new sign-in before linking', async () => {
    const owner = await createOwner()
    const cookie = cookieOf(await authService.signInOwner('owner@example.test', PASSWORD))
    await db
      .update(session)
      .set({ createdAt: new Date(Date.now() - 600000) })
      .where(eq(session.userId, owner.id))

    expect(
      (
        await suppliedProvider('owner@example.test').handler(
          post('link-social', { provider: 'google' }, cookie),
        )
      ).status,
    ).toBe(403)
  })

  it('Given Google and password access, should refuse removing the credential account and permit removing Google', async () => {
    const owner = await createOwner()
    const googleAccountId = randomUUID()
    await db.insert(account).values({
      id: googleAccountId,
      providerId: 'google',
      accountId: GOOGLE_SUBJECT,
      userId: owner.id,
    })
    const [credential] = await db
      .select({ id: account.id })
      .from(account)
      .where(eq(account.providerId, 'credential'))
    const cookie = cookieOf(await authService.signInOwner('owner@example.test', PASSWORD))

    expect(
      (await auth.handler(post('unlink-account', { accountId: credential?.id }, cookie))).status,
    ).toBe(403)
    expect(
      (await auth.handler(post('unlink-account', { accountId: googleAccountId }, cookie))).ok,
    ).toBe(true)
    expect((await authService.signInOwner('owner@example.test', PASSWORD)).ok).toBe(true)
  })

  it('Given a stale session, should refuse unlinking Google', async () => {
    const owner = await createOwner()
    const googleAccountId = randomUUID()
    await db.insert(account).values({
      id: googleAccountId,
      providerId: 'google',
      accountId: GOOGLE_SUBJECT,
      userId: owner.id,
    })
    const cookie = cookieOf(await authService.signInOwner('owner@example.test', PASSWORD))
    await db
      .update(session)
      .set({ createdAt: new Date(Date.now() - 600000) })
      .where(eq(session.userId, owner.id))

    expect(
      (await auth.handler(post('unlink-account', { accountId: googleAccountId }, cookie))).ok,
    ).toBe(false)
    expect(await authService.isGoogleSignInEnabled()).toBe(true)
  })

  it('Given a credential account without a password, should refuse unlinking Google', async () => {
    const owner = await createOwner()
    const googleAccountId = randomUUID()
    await db.insert(account).values({
      id: googleAccountId,
      providerId: 'google',
      accountId: GOOGLE_SUBJECT,
      userId: owner.id,
    })
    const cookie = cookieOf(await authService.signInOwner('owner@example.test', PASSWORD))
    await db.update(account).set({ password: null }).where(eq(account.providerId, 'credential'))

    expect(
      (await auth.handler(post('unlink-account', { accountId: googleAccountId }, cookie))).status,
    ).toBe(403)
    expect(await authService.isGoogleSignInEnabled()).toBe(true)
  })
})
