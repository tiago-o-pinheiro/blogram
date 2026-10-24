import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const getPlacesApiSchema = {
  query: Models.PlaceSearchQuery,
  response: { [StatusCodes.OK]: Models.PlaceSuggestionList },
}
export type GetPlacesApiSchema = typeof getPlacesApiSchema
