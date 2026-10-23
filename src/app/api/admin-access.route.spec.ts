// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { GET as GET_ME } from '@/app/api/me/route'
import { postAuth } from '@/test/auth-session'
import { createSetupCookie } from '@/test/setup-session'

const ME_URL = 'http://localhost:3000/api/me'
const CHANGE_PASSWORD = {
  currentPassword: '::password::-12345',
  newPassword: '::new-password::-12345',
}

const getMe = (cookie?: string) =>
  GET_ME(new Request(ME_URL, cookie ? { headers: { cookie } } : undefined))

describe('admin access', () => {
  it('Given no session, should respond 401 on /api/me', async () => {
    expect((await getMe()).status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given only a setup cookie, should respond 401 on /api/me', async () => {
    const cookie = await createSetupCookie()

    expect((await getMe(cookie)).status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given no session, should respond 401 on change-password', async () => {
    const response = await postAuth('/change-password', CHANGE_PASSWORD)

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('Given only a setup cookie, should respond 401 on change-password', async () => {
    const cookie = await createSetupCookie()

    const response = await postAuth('/change-password', CHANGE_PASSWORD, { cookie })

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })
})
