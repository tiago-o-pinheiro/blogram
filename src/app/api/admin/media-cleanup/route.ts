import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { mediaCleanupController } from '@/server/modules/media/controllers/media-cleanup.controller'

export const POST = withErrorHandler(requireSession(mediaCleanupController.drain))
