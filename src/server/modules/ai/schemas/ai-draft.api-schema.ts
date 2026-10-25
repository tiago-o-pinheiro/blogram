import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const postAiDraftApiSchema = {
  body: Models.AiDraftRequest,
  response: { [StatusCodes.OK]: Models.AiDraft },
}
export type PostAiDraftApiSchema = typeof postAiDraftApiSchema
