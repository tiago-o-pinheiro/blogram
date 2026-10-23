import { withErrorHandler } from '@/server/errors/with-error-handler'
import { setupController } from '@/server/modules/setup/controllers/setup.controller'

export const POST = withErrorHandler(setupController.unlock)
