import { withErrorHandler } from '@/server/errors/with-error-handler'
import { profileController } from '@/server/modules/profile/controllers/profile.controller'

export const GET = withErrorHandler(profileController.getPhoto)
