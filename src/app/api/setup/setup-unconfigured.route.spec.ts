// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { POST as POST_UNLOCK } from '@/app/api/setup/unlock/route'
import { env } from '@/server/config/env'

const BASE_URL = 'http://localhost:3000/api'
const ORIGINAL_SETUP_PASSWORD = env.SETUP_PASSWORD

const requestUnlock = (password: string) =>
  new Request(`${BASE_URL}/setup/unlock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': 'client-unconfigured' },
    body: JSON.stringify({ password }),
  })

beforeEach(() => {
  env.SETUP_PASSWORD = undefined
})

afterEach(() => {
  env.SETUP_PASSWORD = ORIGINAL_SETUP_PASSWORD
})

describe('setup unlock route without a usable SETUP_PASSWORD', () => {
  it('Given SETUP_PASSWORD is missing, should respond 503 and set no setup cookie', async () => {
    const response = await POST_UNLOCK(requestUnlock('::any-password::-12345'))

    expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('Given SETUP_PASSWORD is shorter than 12 characters, should respond 503 and set no setup cookie', async () => {
    env.SETUP_PASSWORD = 'too-short'

    const response = await POST_UNLOCK(requestUnlock('too-short'))

    expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('Given SETUP_PASSWORD is missing, should not accept a guessed default password', async () => {
    const response = await POST_UNLOCK(requestUnlock('password'))

    expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
