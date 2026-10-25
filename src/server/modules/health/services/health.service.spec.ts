// @vitest-environment node
import { describe, expect, it } from 'vitest'

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
})
