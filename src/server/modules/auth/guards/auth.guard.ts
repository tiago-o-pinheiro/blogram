import { UnauthorizedError } from '@/server/errors/http-errors'
import { type RouteHandler } from '@/server/lib/handler'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import { authService } from '@/server/modules/auth/services/auth.service'

export const requireSession =
  (handler: SessionRouteHandler): RouteHandler =>
  async (request, context) => {
    const user = await authService.findUser(request.headers)
    if (!user) {
      throw new UnauthorizedError()
    }
    return handler(request, context, user)
  }
