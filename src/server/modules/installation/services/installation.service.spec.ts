// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { ConflictError, ForbiddenError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { authService } from '@/server/modules/auth/services/auth.service'
import { InstallationService } from '@/server/modules/installation/services/installation.service'

const service = new InstallationService()

const completeWithNewOwner = (identifier: string) =>
  db.transaction(async (tx) => {
    const { id } = await authService.createOwner(tx, {
      identifier,
      password: '::owner-password::-12345',
    })
    await service.completeInstallation(tx, id)
  })

describe('InstallationService', () => {
  it('Given a fresh database, should report pending', async () => {
    expect(await service.getStatus()).toBe('pending')
  })

  it('Given a fresh database, should pass assertPending', async () => {
    await expect(service.assertPending()).resolves.toBeUndefined()
  })

  it('Given a completed installation, should report completed and reject assertPending', async () => {
    await completeWithNewOwner('owner@example.test')

    expect(await service.getStatus()).toBe('completed')
    await expect(service.assertPending()).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('Given an already completed installation, should throw ConflictError', async () => {
    await completeWithNewOwner('owner@example.test')

    await expect(completeWithNewOwner('other@example.test')).rejects.toBeInstanceOf(ConflictError)
  })

  it('Given the modules are re-imported (restart), should still read completed from the database', async () => {
    await completeWithNewOwner('owner@example.test')
    vi.resetModules()

    const restarted = await import('@/server/modules/installation/services/installation.service')

    const restartedDb = await import('@/server/lib/db')
    try {
      expect(await restarted.installationService.getStatus()).toBe('completed')
    } finally {
      await restartedDb.db.$client.end()
      await db.$client.end()
      vi.resetModules()
    }
  })
})
