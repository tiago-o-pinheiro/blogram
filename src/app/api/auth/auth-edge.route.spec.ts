// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { CREDENTIALS, createOwnerSession, postAuth } from '@/test/auth-session'

describe('auth route edge cases', () => {
  it('BH-4: Given a new password shorter than the owner minimum, should reject change-password', async () => {
    const cookie = await createOwnerSession()

    const response = await postAuth(
      '/change-password',
      { currentPassword: CREDENTIALS.password, newPassword: 'short-pw9' },
      { cookie },
    )

    expect(response.status).toBe(StatusCodes.BAD_REQUEST)
  })
})
