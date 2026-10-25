import { describe, expect, it, vi } from 'vitest'

import { Models } from '@/models'

import { ServiceUnavailableError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { HealthService } from '@/server/modules/health/services/health.service'

describe('HealthService', () => {
  it('Given the database answers, should report an ok status', async () => {
    expect(Models.isHealth(await new HealthService(db).getStatus())).toBe(true)
  })

  it('Given the database query fails, should throw a ServiceUnavailableError', async () => {
    const failingDatabase = { execute: () => Promise.reject(new Error('connection refused')) }

    await expect(new HealthService(failingDatabase).getStatus()).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    )
  })

  it('Given the database never answers, should throw a ServiceUnavailableError after the timeout', async () => {
    vi.useFakeTimers()
    const silentDatabase = { execute: () => new Promise<never>(() => undefined) }
    const outcome = expect(
      new HealthService(silentDatabase, 50).getStatus(),
    ).rejects.toBeInstanceOf(ServiceUnavailableError)

    await vi.advanceTimersByTimeAsync(50)
    await outcome
    vi.useRealTimers()
  })
})
