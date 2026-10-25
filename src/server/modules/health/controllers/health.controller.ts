import { StatusCodes } from 'http-status-codes'

import { encode } from '@/server/lib/codec'
import { type RouteHandler } from '@/server/lib/handler'
import { getHealthApiSchema } from '@/server/modules/health/schemas/health.api-schema'
import { type HealthService, healthService } from '@/server/modules/health/services/health.service'

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  getHealth: RouteHandler = async () => {
    const health = encode(
      getHealthApiSchema.response[StatusCodes.OK],
      await this.healthService.getStatus(),
    )
    return Response.json(health, { status: StatusCodes.OK })
  }
}

export const healthController = new HealthController(healthService)
