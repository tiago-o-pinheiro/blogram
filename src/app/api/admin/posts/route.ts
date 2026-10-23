import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { postController } from '@/server/modules/posts/controllers/post.controller'

export const GET = withErrorHandler(requireSession(postController.list))
export const POST = withErrorHandler(requireSession(postController.create))
