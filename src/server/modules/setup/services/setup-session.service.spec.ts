// @vitest-environment node
import { createHash } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '@/server/lib/db'
import { setupSession } from '@/server/modules/setup/schemas/setup.table'

import { SETUP_COOKIE_NAME, SetupSessionService } from './setup-session.service'

const NOW = new Date('2026-01-01T00:00:00.000Z')

describe('SetupSessionService', () => {
  it('Given a created session, should validate its token and store only the hash', async () => {
    const service = new SetupSessionService(() => NOW, false)

    const { token } = await service.create()

    expect(await service.isValid(token)).toBe(true)
    const hash = createHash('sha256').update(token).digest('hex')
    const rows = await db.select().from(setupSession).where(eq(setupSession.tokenHash, hash))
    expect(rows).toHaveLength(1)
    expect(JSON.stringify(await db.select().from(setupSession))).not.toContain(token)
  })

  it('Given a missing or unknown token, should not validate', async () => {
    const service = new SetupSessionService(() => NOW, false)
    await service.create()

    expect(await service.isValid(null)).toBe(false)
    expect(await service.isValid('::unknown::')).toBe(false)
  })

  it('Given the service is re-created, should still validate the earlier token', async () => {
    const { token } = await new SetupSessionService(() => NOW, false).create()

    expect(await new SetupSessionService(() => NOW, false).isValid(token)).toBe(true)
  })

  it('Given a clock past the expiry, should not validate', async () => {
    const { token } = await new SetupSessionService(() => NOW, false).create()
    const later = new Date(NOW.getTime() + 25 * 60 * 60 * 1000)

    expect(await new SetupSessionService(() => later, false).isValid(token)).toBe(false)
  })

  it('Given revokeAll, should invalidate every session', async () => {
    const service = new SetupSessionService(() => NOW, false)
    const first = await service.create()
    const second = await service.create()

    await service.revokeAll()

    expect(await service.isValid(first.token)).toBe(false)
    expect(await service.isValid(second.token)).toBe(false)
  })

  it('Given a transaction, should revoke sessions through it', async () => {
    const service = new SetupSessionService(() => NOW, false)
    const { token } = await service.create()

    await db.transaction((tx) => service.revokeAll(tx))

    expect(await service.isValid(token)).toBe(false)
  })

  it('Given a request with the cookie, should read the token', () => {
    const service = new SetupSessionService(() => NOW, false)
    const headers = new Headers({ cookie: `${SETUP_COOKIE_NAME}=::token::` })

    expect(service.readToken(headers)).toBe('::token::')
    expect(service.readToken(new Headers())).toBeNull()
  })

  it('Given a session, should build an HttpOnly cookie that is Secure only in production', () => {
    const expiresAt = new Date(NOW.getTime() + 3600 * 1000)

    const plain = new SetupSessionService(() => NOW, false).toSetCookie('::token::', expiresAt)
    const secure = new SetupSessionService(() => NOW, true).toSetCookie('::token::', expiresAt)

    expect(plain).toContain('blogram_setup=::token::')
    expect(plain).toContain('HttpOnly')
    expect(plain).toContain('SameSite=Lax')
    expect(plain).toContain('Max-Age=3600')
    expect(plain).not.toContain('Secure')
    expect(secure).toContain('Secure')
  })

  it('Given a clear cookie, should expire it immediately', () => {
    const cookie = new SetupSessionService(() => NOW, false).toClearCookie()

    expect(cookie).toContain('blogram_setup=;')
    expect(cookie).toContain('Max-Age=0')
  })
})
