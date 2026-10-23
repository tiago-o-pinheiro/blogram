import { withErrorHandler } from '@/server/errors/with-error-handler'
import { feedController } from '@/server/modules/feed/controllers/feed.controller'

export const POST = withErrorHandler(feedController.like)
