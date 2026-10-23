// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { GET as GET_ME } from '@/app/api/me/route'
import { db } from '@/server/lib/db'
import { user } from '@/server/modules/auth/schemas/auth.table'
import {
  CREDENTIALS,
  createOwnerSession,
  postAuth,
  signIn,
  toCookieHeader,
} from '@/test/auth-session'

const ME_URL = 'http://localhost:3000/api/me'
const NEW_PASSWORD = '::new-password::-12345'

const getMe = (cookie?: string) =>
  GET_ME(new Request(ME_URL, cookie ? { headers: { cookie } } : undefined))

describe('auth routes', () => {
  it('Given an owner created by email, should sign in with 200 and a session cookie', async () => {
    await createOwnerSession()

    const response = await signIn()

    expect(response.status).toBe(StatusCodes.OK)
    expect(toCookieHeader(response)).not.toBe('')
  })

  it('Given an owner created by username, should sign in by username with 200', async () => {
    await createOwnerSession({ email: 'owner.name', password: CREDENTIALS.password })

    const response = await postAuth('/sign-in/username', {
      username: 'owner.name',
      password: CREDENTIALS.password,
    })

    expect(response.status).toBe(StatusCodes.OK)
    expect(toCookieHeader(response)).not.toBe('')
  })

  it('Given a wrong password, should respond 401', async () => {
    await createOwnerSession()

    const response = await signIn({ ...CREDENTIALS, password: '::wrong-password::-12345' })

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given a session, should end it on sign-out', async () => {
    const cookie = await createOwnerSession()

    const response = await postAuth('/sign-out', {}, { cookie })
    const meResponse = await getMe(cookie)

    expect(response.status).toBe(StatusCodes.OK)
    expect(meResponse.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given a wrong current password, should respond 400 on change-password', async () => {
    const cookie = await createOwnerSession()

    const response = await postAuth(
      '/change-password',
      { currentPassword: '::wrong-password::-12345', newPassword: NEW_PASSWORD },
      { cookie },
    )

    expect(response.status).toBe(StatusCodes.BAD_REQUEST)
  })

  it('Given the right current password, should sign in with the new one and not the old', async () => {
    const cookie = await createOwnerSession()

    const response = await postAuth(
      '/change-password',
      { currentPassword: CREDENTIALS.password, newPassword: NEW_PASSWORD },
      { cookie },
    )
    const newSignIn = await signIn({ ...CREDENTIALS, password: NEW_PASSWORD })
    const oldSignIn = await signIn()

    expect(response.status).toBe(StatusCodes.OK)
    expect(newSignIn.status).toBe(StatusCodes.OK)
    expect(oldSignIn.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given a public sign-up request, should reject it and create no user', async () => {
    const response = await postAuth('/sign-up/email', {
      name: '::intruder::',
      email: 'intruder@example.test',
      password: CREDENTIALS.password,
    })

    expect(response.ok).toBe(false)
    expect(await db.select().from(user)).toHaveLength(0)
  })

  it('Given a session cookie, should return the current user on /me', async () => {
    const cookie = await createOwnerSession()

    const response = await getMe(cookie)

    expect(response.status).toBe(StatusCodes.OK)
    expect(Models.isUser(await response.json())).toBe(true)
  })

  it('Given no session cookie, should respond 401 on /me', async () => {
    const response = await getMe()
    const body = await response.json()

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
    expect(body.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    expect(body.error).toBe('Unauthorized')
  })
})
