import { withErrorHandler } from '@/server/errors/with-error-handler'
import { rssController } from '@/server/modules/feed/controllers/rss.controller'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(rssController.get)
