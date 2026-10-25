import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { videoUploadController } from '@/server/modules/media/controllers/video-upload.controller'

export const DELETE = withErrorHandler(requireSession(videoUploadController.abort))
