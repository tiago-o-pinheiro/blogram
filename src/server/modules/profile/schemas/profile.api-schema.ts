import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const putProfileApiSchema = {
  body: Models.ProfileBundle,
  response: { [StatusCodes.OK]: Models.Profile },
}
export type PutProfileApiSchema = typeof putProfileApiSchema
