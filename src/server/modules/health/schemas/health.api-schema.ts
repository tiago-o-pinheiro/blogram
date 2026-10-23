import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const getHealthApiSchema = {
  response: { [StatusCodes.OK]: Models.Health },
}
export type GetHealthApiSchema = typeof getHealthApiSchema
