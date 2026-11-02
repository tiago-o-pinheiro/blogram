// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { Type } from 'typebox'
import { Value } from 'typebox/value'
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { GET as GET_CODES, POST as POST_CODES } from '@/app/api/admin/recovery-codes/route'
import { POST as POST_REDEEM } from '@/app/api/recovery/route'
import { db } from '@/server/lib/db'
import { session } from '@/server/modules/auth/schemas/auth.table'
import { authService } from '@/server/modules/auth/services/auth.service'
import { RECOVERY_THROTTLE } from '@/server/modules/auth/services/recovery-code.service'
import { installation } from '@/server/modules/installation/schemas/installation.table'
import { CREDENTIALS, createOwnerSession, signIn, toCookieHeader } from '@/test/auth-session'

const CODES_URL = 'http://localhost:3000/api/admin/recovery-codes'
const REDEEM_URL = 'http://localhost:3000/api/recovery'
const NEW_PASSWORD = '::new-password::-12345'
const CLIENT = '::client::'
const USERNAME = 'journal.owner'

const sendJson = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const generate = async (cookie: string, password = CREDENTIALS.password) =>
  POST_CODES(sendJson(CODES_URL, { password }, { cookie }))

const readCodes = async (response: Response) =>
  Value.Decode(Type.Object({ codes: Type.Array(Type.String()) }), await response.json()).codes

const redeem = (code: string, client = CLIENT) =>
  POST_REDEEM(
    sendJson(REDEEM_URL, { code, newPassword: NEW_PASSWORD }, { 'cf-connecting-ip': client }),
  )

const completeInstallation = async (ownerId: string) => {
  await db
    .insert(installation)
    .values({ id: 'singleton', status: 'completed', ownerId, completedAt: new Date() })
}

const setupOwnerWithCodes = async () => {
  const cookie = await createOwnerSession()
  const [owner] = await db.select({ id: session.userId }).from(session).limit(1)
  await completeInstallation(owner?.id ?? '')
  const codes = await readCodes(await generate(cookie))
  return { cookie, codes }
}

describe('recovery code routes', () => {
  it('Given no session, should refuse reading or generating codes', async () => {
    const responses = await Promise.all([
      GET_CODES(new Request(CODES_URL)),
      POST_CODES(sendJson(CODES_URL, { password: CREDENTIALS.password })),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      StatusCodes.UNAUTHORIZED,
      StatusCodes.UNAUTHORIZED,
    ])
  })

  it('Given a wrong current password, should forbid generating codes', async () => {
    const cookie = await createOwnerSession()

    const response = await generate(cookie, '::wrong-password::')

    expect(response.status).toBe(StatusCodes.FORBIDDEN)
  })

  it('Given generated codes, should report every unused code in the status', async () => {
    const { cookie, codes } = await setupOwnerWithCodes()

    const response = await GET_CODES(new Request(CODES_URL, { headers: { cookie } }))
    const status = await response.json()

    expect(codes).toHaveLength(Models.RECOVERY_CODE_COUNT)
    expect(new Set(codes).size).toBe(Models.RECOVERY_CODE_COUNT)
    expect(codes.every((code) => Models.toRecoveryCode(code) === code)).toBe(true)
    expect(status).toEqual({
      remaining: Models.RECOVERY_CODE_COUNT,
      generatedAt: expect.any(String),
    })
  })

  it('Given a valid code, should reset the password, close sessions and reveal the sign-in name', async () => {
    const { codes } = await setupOwnerWithCodes()

    const response = await redeem(codes[0] ?? '')

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ identifier: CREDENTIALS.email })
    expect(await db.select({ id: session.id }).from(session)).toHaveLength(0)
    expect((await signIn()).status).toBe(StatusCodes.UNAUTHORIZED)
    expect((await signIn({ ...CREDENTIALS, password: NEW_PASSWORD })).status).toBe(StatusCodes.OK)
  })

  it('Given a code typed in lowercase without dashes, should still accept it', async () => {
    const { codes } = await setupOwnerWithCodes()

    const response = await redeem((codes[1] ?? '').replaceAll('-', ' ').toLowerCase())

    expect(response.status).toBe(StatusCodes.OK)
  })

  it('Given a code that was already used, should reject it the second time', async () => {
    const { codes } = await setupOwnerWithCodes()
    await redeem(codes[0] ?? '')

    const response = await redeem(codes[0] ?? '')

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given regenerated codes, should stop accepting the previous ones', async () => {
    const { cookie, codes } = await setupOwnerWithCodes()
    await generate(cookie)

    const response = await redeem(codes[0] ?? '')

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given repeated wrong codes from one client, should throttle even a valid code', async () => {
    const { codes } = await setupOwnerWithCodes()
    await Promise.all(
      Array.from({ length: RECOVERY_THROTTLE.clientMaxFailures }, async (_, attempt) =>
        redeem(`AAAA-AAAA-AAA${attempt}`),
      ),
    )

    const response = await redeem(codes[0] ?? '')

    expect(response.status).toBe(StatusCodes.TOO_MANY_REQUESTS)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('Given an owner who signs in with a username, should reveal that username', async () => {
    const owner = await db.transaction((tx) =>
      authService.createOwner(tx, { identifier: USERNAME, password: CREDENTIALS.password }),
    )
    await completeInstallation(owner.id)
    const cookie = toCookieHeader(await authService.signInOwner(USERNAME, CREDENTIALS.password))
    const codes = await readCodes(await generate(cookie))

    const response = await redeem(codes[0] ?? '')

    expect(await response.json()).toEqual({ identifier: USERNAME })
  })

  it('Given a pending installation, should reject any code', async () => {
    const cookie = await createOwnerSession()
    const codes = await readCodes(await generate(cookie))

    const response = await redeem(codes[0] ?? '')

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })
})
