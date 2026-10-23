import { withErrorHandler } from '@/server/errors/with-error-handler'
import { healthController } from '@/server/modules/health/controllers/health.controller'

export const GET = withErrorHandler(healthController.getHealth)
