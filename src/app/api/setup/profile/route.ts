import { withErrorHandler } from '@/server/errors/with-error-handler'
import { setupController } from '@/server/modules/setup/controllers/setup.controller'
import { requireSetup } from '@/server/modules/setup/guards/setup.guard'

export const PUT = withErrorHandler(requireSetup(setupController.saveProfile))
