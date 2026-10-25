import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { encode } from '@/server/lib/codec'
import { readBody, readParams } from '@/server/lib/handler'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import {
  completeVideoUploadApiSchema,
  deleteVideoUploadApiSchema,
  postVideoUploadApiSchema,
} from '@/server/modules/media/schemas/video-upload.api-schema'
import {
  videoUploadService,
  type VideoUploadService,
} from '@/server/modules/media/services/video-upload.service'

const NO_STORE = { 'Cache-Control': 'no-store' }

export class VideoUploadController {
  constructor(private readonly videoUploadService: VideoUploadService) {}

  start: SessionRouteHandler = async (request) => {
    const body = await readBody(postVideoUploadApiSchema.body, request)
    const session = await this.videoUploadService.start(body)
    return Response.json(encode(Models.VideoUploadSession, session), {
      status: StatusCodes.CREATED,
      headers: NO_STORE,
    })
  }

  complete: SessionRouteHandler = async (request, context) => {
    const { id } = await readParams(completeVideoUploadApiSchema.params, context)
    const body = await readBody(completeVideoUploadApiSchema.body, request)
    const ready = await this.videoUploadService.complete(id, body)
    return Response.json(encode(Models.VideoUploadReady, ready), {
      status: StatusCodes.OK,
      headers: NO_STORE,
    })
  }

  abort: SessionRouteHandler = async (_request, context) => {
    const { id } = await readParams(deleteVideoUploadApiSchema.params, context)
    await this.videoUploadService.abort(id)
    return new Response(null, { status: StatusCodes.NO_CONTENT, headers: NO_STORE })
  }
}

export const videoUploadController = new VideoUploadController(videoUploadService)
