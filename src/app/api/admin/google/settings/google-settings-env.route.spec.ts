// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET, PUT } from '@/app/api/admin/google/settings/route'
import { POST as authPost } from '@/app/api/auth/[...all]/route'
import { db } from '@/server/lib/db'
import { googleSignInSettings } from '@/server/modules/auth/schemas/google-settings.table'
import { createOwnerSession } from '@/test/auth-session'

vi.hoisted(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'env-client-id')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'env-client-secret')
})

const URL = 'http://localhost:3000/api/admin/google/settings'

const sendPut = (body: unknown, cookie: string) =>
  new Request(URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  })

describe('google settings managed by env', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  it('Given both GOOGLE vars, should report the env source', async () => {
    const response = await GET(new Request(URL, { headers: { cookie } }))

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toMatchObject({
      source: 'env',
      isEnabled: true,
      clientId: 'env-client-id',
      hasClientSecret: true,
    })
  })

  it('Given both GOOGLE vars, should answer 409 on put', async () => {
    const response = await PUT(
      sendPut({ isEnabled: true, clientId: 'other-id', clientSecret: 'other-secret' }, cookie),
    )

    expect(response.status).toBe(StatusCodes.CONFLICT)
    expect(await response.json()).toMatchObject({ details: { reason: 'google-managed-by-env' } })
  })

  it('Given a different stored row, should sign in with the env client id', async () => {
    await db
      .insert(googleSignInSettings)
      .values({ id: 'singleton', isEnabled: true, clientId: 'stored-client-id' })

    const response = await authPost(
      new Request('http://localhost:3000/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
      }),
    )
    const body = await response.json()

    expect(new globalThis.URL(body.url).searchParams.get('client_id')).toBe('env-client-id')
  })
})
