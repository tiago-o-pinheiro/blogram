import { withErrorHandler } from '@/server/errors/with-error-handler'
import { aiDraftController } from '@/server/modules/ai/controllers/ai-draft.controller'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'

export const POST = withErrorHandler(requireSession(aiDraftController.draft))
