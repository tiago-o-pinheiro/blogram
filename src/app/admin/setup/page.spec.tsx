// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { setupService } from '@/server/modules/setup/services/setup.service'

import Page from './page'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

describe('Admin setup page', () => {
  it('Given a completed installation, should respond with not-found', async () => {
    vi.spyOn(setupService, 'resolveEntry').mockResolvedValue('completed')

    await expect(Page()).rejects.toMatchObject({
      digest: expect.stringContaining('404'),
    })
  })
})
