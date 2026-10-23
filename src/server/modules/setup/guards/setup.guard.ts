import { UnauthorizedError } from '@/server/errors/http-errors'
import { type RouteHandler } from '@/server/lib/handler'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { setupSessionService } from '@/server/modules/setup/services/setup-session.service'

export const requireSetup =
  (handler: RouteHandler): RouteHandler =>
  async (request, context) => {
    await installationService.assertPending()
    const token = setupSessionService.readToken(request.headers)
    if (!(await setupSessionService.isValid(token))) {
      throw new UnauthorizedError()
    }
    return handler(request, context)
  }
