import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { env } from '@/server/config/env'
import { ValidationError } from '@/server/errors/http-errors'
import { encode } from '@/server/lib/codec'
import { readBody, type RouteHandler } from '@/server/lib/handler'
import { MULTIPART_OVERHEAD_BYTES, readMultipart } from '@/server/lib/multipart'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import {
  putProfileApiSchema,
  putSettingsApiSchema,
} from '@/server/modules/profile/schemas/profile.api-schema'
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

  saveProfile: SessionRouteHandler = async (request) => {
    const body = await readBody(putProfileApiSchema.body, request)
    const saved = await this.profileService.saveProfile(body)
    return Response.json(encode(Models.Profile, saved), { status: StatusCodes.OK })
  }

  uploadPhoto: SessionRouteHandler = async (request) => {
    const form = await readMultipart(request, env.UPLOAD_MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES)
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new ValidationError('Field "file" is required')
    }
    const saved = await this.profileService.replacePhoto(file)
    return Response.json(encode(Models.Profile, saved), { status: StatusCodes.OK })
  }

  getSettings: SessionRouteHandler = async () =>
    Response.json(encode(Models.SiteSettings, await this.profileService.getSettings()), {
      status: StatusCodes.OK,
    })

  saveSettings: SessionRouteHandler = async (request) => {
    const body = await readBody(putSettingsApiSchema.body, request)
    const saved = await this.profileService.saveSettings(body)
    return Response.json(encode(Models.SiteSettings, saved), { status: StatusCodes.OK })
  }
}

export const profileController = new ProfileController(profileService, setupSessionService)
