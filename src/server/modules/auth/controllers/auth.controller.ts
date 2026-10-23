import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { encode } from '@/server/lib/codec'
import { type RouteHandler } from '@/server/lib/handler'
import { authService, type AuthService } from '@/server/modules/auth/services/auth.service'

export type SessionRouteHandler = (
  ...parameters: [...Parameters<RouteHandler>, user: Models.User]
) => ReturnType<RouteHandler>

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  handle: RouteHandler = (request) => this.authService.handle(request)

  getMe: SessionRouteHandler = (_request, _context, user) =>
    Response.json(encode(Models.User, user), { status: StatusCodes.OK })
}

export const authController = new AuthController(authService)
