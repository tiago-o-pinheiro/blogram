import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { encode } from '@/server/lib/codec'
import { readBody } from '@/server/lib/handler'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import { putGoogleSettingsApiSchema } from '@/server/modules/auth/schemas/google-settings.api-schema'
import {
  googleSettingsService,
  type GoogleSettingsService,
} from '@/server/modules/auth/services/google-settings.service'

export class GoogleSettingsController {
  constructor(private readonly googleSettingsService: GoogleSettingsService) {}

  getSettings: SessionRouteHandler = async () =>
    Response.json(
      encode(Models.GoogleSignInSettings, await this.googleSettingsService.getSettings()),
      { status: StatusCodes.OK },
    )

  saveSettings: SessionRouteHandler = async (request) => {
    const body = await readBody(putGoogleSettingsApiSchema.body, request)
    const saved = await this.googleSettingsService.saveSettings(body)
    return Response.json(encode(Models.GoogleSignInSettings, saved), { status: StatusCodes.OK })
  }
}

export const googleSettingsController = new GoogleSettingsController(googleSettingsService)
