import { Type } from 'typebox'

import { readParams, readQuery, type RouteHandler } from '@/server/lib/handler'
import {
  shareCardService,
  type ShareCardService,
} from '@/server/modules/feed/services/share-card.service'
import { PostIdParams } from '@/server/modules/posts/schemas/post.api-schema'

const CardQuery = Type.Object({
  format: Type.Union([Type.Literal('story'), Type.Literal('og')], { default: 'story' }),
})

export class ShareCardController {
  constructor(private readonly shareCardService: ShareCardService) {}

  get: RouteHandler = async (request, context) => {
    const { id } = await readParams(PostIdParams, context)
    const { format } = readQuery(CardQuery, request)
    const body = await this.shareCardService.render(id, format)
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `${format === 'story' ? 'attachment' : 'inline'}; filename="blogram-${id}.png"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }
}

export const shareCardController = new ShareCardController(shareCardService)
