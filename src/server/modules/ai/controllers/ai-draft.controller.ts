import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { env } from '@/server/config/env'
import { decode, encode } from '@/server/lib/codec'
import { MULTIPART_OVERHEAD_BYTES, readMultipart } from '@/server/lib/multipart'
import { postAiDraftApiSchema } from '@/server/modules/ai/schemas/ai-draft.api-schema'
import {
  aiWriterService,
  type AiWriterService,
} from '@/server/modules/ai/services/ai-writer.service'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'

const readText = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export class AiDraftController {
  constructor(private readonly aiWriterService: AiWriterService) {}

  draft: SessionRouteHandler = async (request) => {
    const form = await readMultipart(request, env.UPLOAD_MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES)
    const file = form.get('file')
    const mediaId = readText(form, 'mediaId')
    const body = decode(postAiDraftApiSchema.body, {
      prompt: readText(form, 'prompt'),
      postType: readText(form, 'postType'),
      fields: form.getAll('field').filter((value) => typeof value === 'string'),
      title: readText(form, 'title'),
      altText: readText(form, 'altText'),
      text: readText(form, 'text'),
      ...(mediaId === '' ? {} : { mediaId }),
    })
    const draft = await this.aiWriterService.draft({
      ...body,
      ...(file instanceof File ? { file } : {}),
    })
    return Response.json(encode(Models.AiDraft, draft), { status: StatusCodes.OK })
  }
}

export const aiDraftController = new AiDraftController(aiWriterService)
