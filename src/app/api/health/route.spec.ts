import { StatusCodes } from 'http-status-codes'
import { describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { withErrorHandler } from '@/server/errors/with-error-handler'
import { HealthController } from '@/server/modules/health/controllers/health.controller'
import { HealthService } from '@/server/modules/health/services/health.service'

import { GET } from './route'

describe('GET /api/health', () => {
  it('Given a running app, should report an ok status with uptime and timestamp', async () => {
    const response = await GET(new Request('http://test/api/health'))

    expect(response.status).toBe(StatusCodes.OK)
    expect(Models.isHealth(await response.json())).toBe(true)
  })

  it('Given the database query fails, should answer 503 through the error handler', async () => {
    const failingDatabase = { execute: () => Promise.reject(new Error('connection refused')) }
    const handler = withErrorHandler(
      new HealthController(new HealthService(failingDatabase)).getHealth,
    )

    const response = await handler(new Request('http://test/api/health'))

    expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE)
  })
})
