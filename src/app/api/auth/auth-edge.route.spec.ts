// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { OWNER_PASSWORD_MAX } from '@/models/models'

import { CREDENTIALS, createOwnerSession, postAuth, signIn } from '@/test/auth-session'

describe('auth route edge cases', () => {
  it.each([
    ['an empty', ''],
    ['an overlong', 'x'.repeat(OWNER_PASSWORD_MAX + 1)],
  ])(
    'BH-4: Given %s new password, should reject change-password and keep the old credential',
    async (_name, newPassword) => {
      const cookie = await createOwnerSession()

      const response = await postAuth(
        '/change-password',
        { currentPassword: CREDENTIALS.password, newPassword },
        { cookie },
      )
      const oldSignIn = await signIn()

      expect(response.status).toBe(StatusCodes.BAD_REQUEST)
      expect(oldSignIn.status).toBe(StatusCodes.OK)
    },
  )

  it('Given a one-character new password, should change it and sign in with it', async () => {
    const cookie = await createOwnerSession()

    const response = await postAuth(
      '/change-password',
      { currentPassword: CREDENTIALS.password, newPassword: 'x' },
      { cookie },
    )
    const newSignIn = await signIn({ ...CREDENTIALS, password: 'x' })

    expect(response.status).toBe(StatusCodes.OK)
    expect(newSignIn.status).toBe(StatusCodes.OK)
  })

  it('Given a new password at the maximum length, should change it and sign in with it', async () => {
    const cookie = await createOwnerSession()
    const newPassword = 'x'.repeat(OWNER_PASSWORD_MAX)

    const response = await postAuth(
      '/change-password',
      { currentPassword: CREDENTIALS.password, newPassword },
      { cookie },
    )
    const newSignIn = await signIn({ ...CREDENTIALS, password: newPassword })

    expect(response.status).toBe(StatusCodes.OK)
    expect(newSignIn.status).toBe(StatusCodes.OK)
  })
})
