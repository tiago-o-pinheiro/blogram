// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { GET as GET_ME } from '@/app/api/me/route'
import {
  CREDENTIALS,
  createSessionCookie,
  signIn,
  signUp,
  toCookieHeader,
} from '@/test/auth-session'

const ME_URL = 'http://localhost:3000/api/me'

describe('auth routes', () => {
  it('Given valid credentials, should sign up with 200 and a session cookie', async () => {
    const response = await signUp()

    expect(response.status).toBe(StatusCodes.OK)
    expect(toCookieHeader(response)).not.toBe('')
  })

  it('Given a registered user, should sign in with 200 and a session cookie', async () => {
    await signUp()

    const response = await signIn()

    expect(response.status).toBe(StatusCodes.OK)
    expect(toCookieHeader(response)).not.toBe('')
  })

  it('Given a wrong password, should respond 401', async () => {
    await signUp()

    const response = await signIn({ ...CREDENTIALS, password: '::wrong-password::-12345' })

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given a session cookie, should return the current user on /me', async () => {
    const cookie = await createSessionCookie()

    const response = await GET_ME(new Request(ME_URL, { headers: { cookie } }))

    expect(response.status).toBe(StatusCodes.OK)
    expect(Models.isUser(await response.json())).toBe(true)
  })

  it('Given no session cookie, should respond 401 on /me', async () => {
    const response = await GET_ME(new Request(ME_URL))
    const body = await response.json()

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
    expect(body.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    expect(body.error).toBe('Unauthorized')
  })
})
