// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { authService } from '@/server/modules/auth/services/auth.service'
import { setupService } from '@/server/modules/setup/services/setup.service'

import Page from './page'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Admin entry page', () => {
  it('Given a completed installation and no owner session, should redirect to sign-in', async () => {
    vi.spyOn(setupService, 'resolveEntry').mockResolvedValue('completed')
    vi.spyOn(authService, 'findUser').mockResolvedValue(null)

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT:/sign-in')
  })

  it('Given a completed installation and an owner session, should redirect to the posts list', async () => {
    vi.spyOn(setupService, 'resolveEntry').mockResolvedValue('completed')
    vi.spyOn(authService, 'findUser').mockResolvedValue({
      id: 'owner-1',
      name: 'Owner',
      email: 'owner@example.com',
    })

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT:/admin/posts')
  })
})
