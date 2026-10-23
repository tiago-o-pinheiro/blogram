import { withErrorHandler } from '@/server/errors/with-error-handler'
import { shareCardController } from '@/server/modules/feed/controllers/share-card.controller'

export const GET = withErrorHandler(shareCardController.get)
