// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { GET as GET_ME } from '@/app/api/me/route'
import { POST as POST_FINALIZE } from '@/app/api/setup/finalize/route'
import { POST as POST_PHOTO } from '@/app/api/setup/profile/photo/route'
import { PUT as PUT_PROFILE } from '@/app/api/setup/profile/route'
import { POST as POST_UNLOCK } from '@/app/api/setup/unlock/route'
import { toCookieHeader } from '@/test/auth-session'
import {
  createJpegWithGps,
  createOversizeBuffer,
  createPng,
  createTextAsJpg,
} from '@/test/image-fixtures'

const BASE_URL = 'http://localhost:3000/api'
const SETUP_PASSWORD = 'test-setup-password-123'
const OWNER_PASSWORD = '::owner-password::-12345'
const PROFILE = { name: 'Ada Lovelace', description: 'Writes about engines' }
const OWNER = {
  identifier: 'owner@example.test',
  password: OWNER_PASSWORD,
  passwordConfirmation: OWNER_PASSWORD,
}
const MAX_IMAGE_BYTES = 10485760

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

const unlock = (password: string, clientKey = 'client-a') =>
  sendJson(POST_UNLOCK, '/setup/unlock', 'POST', { password }, { 'x-forwarded-for': clientKey })

const unlockedCookie = async (clientKey = 'client-a') =>
  toCookieHeader(await unlock(SETUP_PASSWORD, clientKey))

const saveProfile = (cookie?: string) =>
  sendJson(PUT_PROFILE, '/setup/profile', 'PUT', PROFILE, cookie ? { cookie } : {})

const uploadPhoto = (bytes: Uint8Array, type: string, cookie?: string) => {
  const form = new FormData()
  form.set('file', new File([new Uint8Array(bytes)], 'photo', { type }))
  return POST_PHOTO(
    new Request(`${BASE_URL}/setup/profile/photo`, {
      method: 'POST',
      body: form,
      headers: cookie ? { cookie } : {},
    }),
  )
}

const finalize = (cookie?: string, body = OWNER) =>
  sendJson(POST_FINALIZE, '/setup/finalize', 'POST', body, cookie ? { cookie } : {})

const completeSetup = async () => {
  const cookie = await unlockedCookie()
  await saveProfile(cookie)
  return finalize(cookie)
}

describe('setup unlock route', () => {
  it('Given the right password, should respond 204 with a hardened setup cookie', async () => {
    const response = await unlock(SETUP_PASSWORD)
    const cookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(StatusCodes.NO_CONTENT)
    expect(cookie).toContain('blogram_setup=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
  })

  it('Given a wrong password, should respond 401 without a cookie', async () => {
    const response = await unlock('::wrong-password::')

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('Given a missing password, should respond 422', async () => {
    const response = await sendJson(POST_UNLOCK, '/setup/unlock', 'POST', {})

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given repeated wrong passwords, should respond 429 with Retry-After even for the right one', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await unlock('::wrong-password::', 'client-throttled')
    }

    const response = await unlock(SETUP_PASSWORD, 'client-throttled')

    expect(response.status).toBe(StatusCodes.TOO_MANY_REQUESTS)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('Given a throttled client, should still let another client unlock', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await unlock('::wrong-password::', 'client-throttled')
    }

    const response = await unlock(SETUP_PASSWORD, 'client-other')

    expect(response.status).toBe(StatusCodes.NO_CONTENT)
  })

  it('Given a completed installation, should respond 403', async () => {
    await completeSetup()

    const response = await unlock(SETUP_PASSWORD)

    expect(response.status).toBe(StatusCodes.FORBIDDEN)
  })
})

describe('setup step routes', () => {
  it('Given no setup session, should respond 401 on every step', async () => {
    const png = await createPng()

    expect((await saveProfile()).status).toBe(StatusCodes.UNAUTHORIZED)
    expect((await uploadPhoto(png, 'image/png')).status).toBe(StatusCodes.UNAUTHORIZED)
    expect((await finalize()).status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given an unlocked session, should save the profile with 200', async () => {
    const cookie = await unlockedCookie()

    const response = await saveProfile(cookie)

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ ...PROFILE, hasPhoto: false })
  })

  it('Given a valid image with GPS data, should store it and report a photo', async () => {
    const cookie = await unlockedCookie()
    await saveProfile(cookie)

    const response = await uploadPhoto(await createJpegWithGps(), 'image/jpeg', cookie)

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toMatchObject({ hasPhoto: true })
  })

  it('Given text named as an image, should respond 422', async () => {
    const cookie = await unlockedCookie()
    await saveProfile(cookie)

    const response = await uploadPhoto(createTextAsJpg(), 'image/jpeg', cookie)

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given an oversize image, should respond 413', async () => {
    const cookie = await unlockedCookie()
    await saveProfile(cookie)

    const response = await uploadPhoto(createOversizeBuffer(MAX_IMAGE_BYTES), 'image/png', cookie)

    expect(response.status).toBe(StatusCodes.REQUEST_TOO_LONG)
  })
})

describe('setup finalize route', () => {
  it('Given a complete wizard, should respond 200 and sign the owner in', async () => {
    const response = await completeSetup()
    const meResponse = await GET_ME(
      new Request(`${BASE_URL}/me`, { headers: { cookie: toCookieHeader(response) } }),
    )

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ redirectTo: '/admin' })
    expect(meResponse.status).toBe(StatusCodes.OK)
  })

  it('Given a finalized setup, should clear the setup cookie', async () => {
    const response = await completeSetup()

    expect(
      response.headers.getSetCookie().some((cookie) => cookie.startsWith('blogram_setup=;')),
    ).toBe(true)
  })

  it('Given mismatched passwords, should respond 422', async () => {
    const cookie = await unlockedCookie()
    await saveProfile(cookie)

    const response = await finalize(cookie, {
      ...OWNER,
      passwordConfirmation: '::different::-12345',
    })

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given an already finalized setup, should respond 403 on every step', async () => {
    const cookie = await unlockedCookie()
    await saveProfile(cookie)
    await finalize(cookie)

    expect((await finalize(cookie)).status).toBe(StatusCodes.FORBIDDEN)
    expect((await saveProfile(cookie)).status).toBe(StatusCodes.FORBIDDEN)
  })
})
