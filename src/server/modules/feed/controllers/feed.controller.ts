import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { encode } from '@/server/lib/codec'
import { readParams, readQuery, type RouteHandler } from '@/server/lib/handler'
import { feedService, type FeedService } from '@/server/modules/feed/services/feed.service'
import { PostIdParams } from '@/server/modules/posts/schemas/post.api-schema'

export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  list: RouteHandler = async (request) => {
    const query = readQuery(Models.FeedQuery, request)
    return Response.json(encode(Models.PostPage, await this.feedService.list(query)), {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  get: RouteHandler = async (_request, context) => {
    const { id } = await readParams(PostIdParams, context)
    return Response.json(encode(Models.Post, await this.feedService.get(id)), {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  like: RouteHandler = async (_request, context) => {
    const { id } = await readParams(PostIdParams, context)
    return Response.json(encode(Models.PostLikes, await this.feedService.like(id)), {
      status: StatusCodes.OK,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export const feedController = new FeedController(feedService)
