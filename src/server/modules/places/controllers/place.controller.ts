import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { encode } from '@/server/lib/codec'
import { readQuery } from '@/server/lib/handler'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import { getPlacesApiSchema } from '@/server/modules/places/schemas/place.api-schema'
import { placeService, type PlaceService } from '@/server/modules/places/services/place.service'

export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  search: SessionRouteHandler = async (request) => {
    const query = readQuery(getPlacesApiSchema.query, request)
    const places = await this.placeService.search(query)
    return Response.json(encode(Models.PlaceSuggestionList, { data: places }), {
      status: StatusCodes.OK,
    })
  }
}

export const placeController = new PlaceController(placeService)
