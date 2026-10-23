// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { createOwnerSession } from '@/test/auth-session'

import { POST } from './route'

describe('Media cleanup route', () => {
  it('Given no session, should refuse cleanup access', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/admin/media-cleanup', { method: 'POST' }),
    )

    expect(response.status).toBe(401)
  })

  it('Given an owner session, should return bounded cleanup counts', async () => {
    const cookie = await createOwnerSession()

    const response = await POST(
      new Request('http://localhost:3000/api/admin/media-cleanup', {
        method: 'POST',
        headers: { cookie },
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ deleted: 0, pending: 0 })
  })
})
