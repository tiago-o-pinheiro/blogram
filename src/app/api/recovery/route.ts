import { withErrorHandler } from '@/server/errors/with-error-handler'
import { recoveryCodeController } from '@/server/modules/auth/controllers/recovery-code.controller'

export const POST = withErrorHandler(recoveryCodeController.redeem)
