import { StatusCodes } from 'http-status-codes'

import { type RouteHandler } from '@/server/lib/handler'
import {
  profileService,
  type ProfileService,
} from '@/server/modules/profile/services/profile.service'
import {
  setupSessionService,
  type SetupSessionService,
} from '@/server/modules/setup/services/setup-session.service'

export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly setupSessionService: SetupSessionService,
  ) {}

  getPhoto: RouteHandler = async (request) => {
    const token = this.setupSessionService.readToken(request.headers)
    const hasSetupSession = await this.setupSessionService.isValid(token)
    const photo = await this.profileService.readPhoto({ hasSetupSession })
    return new Response(new Uint8Array(photo.body), {
      status: StatusCodes.OK,
      headers: {
        'Content-Type': photo.contentType,
        'Content-Length': String(photo.size),
        'Cache-Control': 'no-cache',
      },
    })
  }
}

export const profileController = new ProfileController(profileService, setupSessionService)
