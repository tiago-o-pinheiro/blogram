import { Type } from 'typebox'

import { Models } from '@/models'

import { encode } from '@/server/lib/codec'
import { readBody } from '@/server/lib/handler'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import {
  metadataService,
  type MetadataService,
} from '@/server/modules/posts/services/metadata.service'

const MetadataRequest = Type.Object({ url: Type.String({ minLength: 1, maxLength: 2048 }) })

export class MetadataController {
  constructor(private readonly service: MetadataService) {}

  fetch: SessionRouteHandler = async (request) => {
    const { url } = await readBody(MetadataRequest, request)
    const metadata = await this.service.fetchMetadata(url)
    return Response.json(encode(Models.LinkMetadata, metadata))
  }
}

export const metadataController = new MetadataController(metadataService)
