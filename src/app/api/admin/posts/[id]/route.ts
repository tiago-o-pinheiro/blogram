import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { postController } from '@/server/modules/posts/controllers/post.controller'

export const GET = withErrorHandler(requireSession(postController.get))
export const PATCH = withErrorHandler(requireSession(postController.update))
export const DELETE = withErrorHandler(requireSession(postController.remove))
