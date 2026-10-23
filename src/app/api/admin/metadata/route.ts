import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { metadataController } from '@/server/modules/posts/controllers/metadata.controller'

export const POST = withErrorHandler(requireSession(metadataController.fetch))
