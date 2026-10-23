import { withErrorHandler } from '@/server/errors/with-error-handler'
import { authController } from '@/server/modules/auth/controllers/auth.controller'

export const GET = withErrorHandler(authController.handle)
export const POST = withErrorHandler(authController.handle)
