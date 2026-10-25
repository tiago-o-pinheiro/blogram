import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { encode } from '@/server/lib/codec'
import { readBody } from '@/server/lib/handler'
import { putAiSettingsApiSchema } from '@/server/modules/ai/schemas/ai-settings.api-schema'
import {
  aiSettingsService,
  type AiSettingsService,
} from '@/server/modules/ai/services/ai-settings.service'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'

export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  getSettings: SessionRouteHandler = async () =>
    Response.json(encode(Models.AiSettings, await this.aiSettingsService.getSettings()), {
      status: StatusCodes.OK,
    })

  saveSettings: SessionRouteHandler = async (request) => {
    const body = await readBody(putAiSettingsApiSchema.body, request)
    const saved = await this.aiSettingsService.saveSettings(body)
    return Response.json(encode(Models.AiSettings, saved), { status: StatusCodes.OK })
  }
}

export const aiSettingsController = new AiSettingsController(aiSettingsService)
