import { withErrorHandler } from '@/server/errors/with-error-handler'
import { authController } from '@/server/modules/auth/controllers/auth.controller'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'

export const GET = withErrorHandler(requireSession(authController.getMe))
