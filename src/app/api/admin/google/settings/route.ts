import { withErrorHandler } from '@/server/errors/with-error-handler'
import { googleSettingsController } from '@/server/modules/auth/controllers/google-settings.controller'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'

export const GET = withErrorHandler(requireSession(googleSettingsController.getSettings))
export const PUT = withErrorHandler(requireSession(googleSettingsController.saveSettings))
