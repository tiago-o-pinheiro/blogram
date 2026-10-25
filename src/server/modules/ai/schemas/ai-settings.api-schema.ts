import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const getAiSettingsApiSchema = {
  response: { [StatusCodes.OK]: Models.AiSettings },
}
export type GetAiSettingsApiSchema = typeof getAiSettingsApiSchema

export const putAiSettingsApiSchema = {
  body: Models.AiSettingsUpdate,
  response: { [StatusCodes.OK]: Models.AiSettings },
}
export type PutAiSettingsApiSchema = typeof putAiSettingsApiSchema
