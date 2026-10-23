import { withErrorHandler } from '@/server/errors/with-error-handler'
import { mediaController } from '@/server/modules/media/controllers/media.controller'

export const GET = withErrorHandler(mediaController.getMedia)
export const HEAD = withErrorHandler(mediaController.getMedia)
