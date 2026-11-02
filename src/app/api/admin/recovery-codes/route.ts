import { withErrorHandler } from '@/server/errors/with-error-handler'
import { recoveryCodeController } from '@/server/modules/auth/controllers/recovery-code.controller'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'

export const GET = withErrorHandler(requireSession(recoveryCodeController.getStatus))
export const POST = withErrorHandler(requireSession(recoveryCodeController.generate))
