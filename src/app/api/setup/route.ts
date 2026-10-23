import { withErrorHandler } from '@/server/errors/with-error-handler'
import { setupController } from '@/server/modules/setup/controllers/setup.controller'

export const GET = withErrorHandler(setupController.getState)
