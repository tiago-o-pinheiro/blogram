// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { OWNER_PASSWORD_MAX } from '@/models/models'

import { POST as POST_FINALIZE } from '@/app/api/setup/finalize/route'
import { PUT as PUT_PROFILE } from '@/app/api/setup/profile/route'
import { POST as POST_UNLOCK } from '@/app/api/setup/unlock/route'
import { authService } from '@/server/modules/auth/services/auth.service'
import { toCookieHeader } from '@/test/auth-session'

const BASE_URL = 'http://localhost:3000/api'
const SETUP_PASSWORD = 'test-setup-password-123'
const WRONG_PASSWORD = '::wrong-password::'
const OWNER_PASSWORD = '::owner-password::-12345'
const PROFILE = { name: 'Ada Lovelace', description: 'Writes about engines' }

const sendJson = (
  handler: (request: Request) => Promise<Response> | Response,
  path: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  handler(
    new Request(`${BASE_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )

const unlock = (password: string, clientKey: string) =>
  sendJson(POST_UNLOCK, '/setup/unlock', 'POST', { password }, { 'x-forwarded-for': clientKey })

describe('setup edge cases', () => {
  it('BH-1: Given an email Better Auth would reject, should respond 422 before committing the owner', async () => {
    const cookie = toCookieHeader(await unlock(SETUP_PASSWORD, 'client-a'))
    await sendJson(PUT_PROFILE, '/setup/profile', 'PUT', PROFILE, { cookie })

    const response = await sendJson(
      POST_FINALIZE,
      '/setup/finalize',
      'POST',
      {
        identifier: 'josé@example.com',
        password: OWNER_PASSWORD,
        passwordConfirmation: OWNER_PASSWORD,
      },
      { cookie },
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('BH-2: Given one client keeps retrying after its own lockout, should still let another client unlock', async () => {
    for (let attempt = 0; attempt < 35; attempt += 1) {
      await unlock(WRONG_PASSWORD, 'client-noisy')
    }

    const response = await unlock(SETUP_PASSWORD, 'client-owner')

    expect(response.status).toBe(StatusCodes.NO_CONTENT)
  })

  it('Given a one-character owner password, should finish setup and let the owner sign in with it', async () => {
    const cookie = toCookieHeader(await unlock(SETUP_PASSWORD, 'client-a'))
    await sendJson(PUT_PROFILE, '/setup/profile', 'PUT', PROFILE, { cookie })

    const response = await sendJson(
      POST_FINALIZE,
      '/setup/finalize',
      'POST',
      { identifier: 'owner@example.test', password: 'x', passwordConfirmation: 'x' },
      { cookie },
    )
    const signIn = await authService.signInOwner('owner@example.test', 'x')

    expect(response.status).toBe(StatusCodes.OK)
    expect(signIn.status).toBe(StatusCodes.OK)
  })

  it('Given an owner password at the maximum length, should finish setup and let the owner sign in with it', async () => {
    const cookie = toCookieHeader(await unlock(SETUP_PASSWORD, 'client-a'))
    await sendJson(PUT_PROFILE, '/setup/profile', 'PUT', PROFILE, { cookie })
    const password = 'x'.repeat(OWNER_PASSWORD_MAX)

    const response = await sendJson(
      POST_FINALIZE,
      '/setup/finalize',
      'POST',
      { identifier: 'owner@example.test', password, passwordConfirmation: password },
      { cookie },
    )
    const signIn = await authService.signInOwner('owner@example.test', password)

    expect(response.status).toBe(StatusCodes.OK)
    expect(signIn.status).toBe(StatusCodes.OK)
  })

  it.each([
    ['an empty', ''],
    ['an overlong', 'x'.repeat(OWNER_PASSWORD_MAX + 1)],
  ])('Given %s owner password, should respond 422', async (_name, password) => {
    const cookie = toCookieHeader(await unlock(SETUP_PASSWORD, 'client-a'))
    await sendJson(PUT_PROFILE, '/setup/profile', 'PUT', PROFILE, { cookie })

    const response = await sendJson(
      POST_FINALIZE,
      '/setup/finalize',
      'POST',
      { identifier: 'owner@example.test', password, passwordConfirmation: password },
      { cookie },
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('BH-3: Given a whitespace-only profile name, should respond 422', async () => {
    const cookie = toCookieHeader(await unlock(SETUP_PASSWORD, 'client-a'))

    const response = await sendJson(
      PUT_PROFILE,
      '/setup/profile',
      'PUT',
      { name: '   ', description: '' },
      { cookie },
    )

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })
})
