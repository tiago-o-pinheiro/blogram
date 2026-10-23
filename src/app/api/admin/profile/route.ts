import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { profileController } from '@/server/modules/profile/controllers/profile.controller'

export const PUT = withErrorHandler(requireSession(profileController.saveProfile))
