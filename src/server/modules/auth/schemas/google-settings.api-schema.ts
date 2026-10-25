import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const getGoogleSettingsApiSchema = {
  response: { [StatusCodes.OK]: Models.GoogleSignInSettings },
}
export type GetGoogleSettingsApiSchema = typeof getGoogleSettingsApiSchema

export const putGoogleSettingsApiSchema = {
  body: Models.GoogleSignInSettingsUpdate,
  response: { [StatusCodes.OK]: Models.GoogleSignInSettings },
}
export type PutGoogleSettingsApiSchema = typeof putGoogleSettingsApiSchema
