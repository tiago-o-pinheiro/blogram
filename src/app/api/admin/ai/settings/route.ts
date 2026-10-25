import { withErrorHandler } from '@/server/errors/with-error-handler'
import { aiSettingsController } from '@/server/modules/ai/controllers/ai-settings.controller'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'

export const GET = withErrorHandler(requireSession(aiSettingsController.getSettings))
export const PUT = withErrorHandler(requireSession(aiSettingsController.saveSettings))
