// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'
import { authService } from '@/server/modules/auth/services/auth.service'

const nextHeaders = vi.hoisted(() => ({ headers: vi.fn() }))
const nextNavigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock('next/headers', () => nextHeaders)
vi.mock('next/navigation', () => nextNavigation)

describe('requireOwnerPage', () => {
  beforeEach(() => {
    nextHeaders.headers.mockResolvedValue(new Headers())
  })

  it('Given no session, should redirect to /sign-in', async () => {
    vi.spyOn(authService, 'findUser').mockResolvedValue(null)

    await expect(requireOwnerPage()).rejects.toThrow('redirect:/sign-in')
  })

  it('Given a session, should return the owner', async () => {
    const owner = { id: 'owner-1', name: 'Owner', email: 'owner@example.test' }
    vi.spyOn(authService, 'findUser').mockResolvedValue(owner)

    await expect(requireOwnerPage()).resolves.toEqual(owner)
  })
})
