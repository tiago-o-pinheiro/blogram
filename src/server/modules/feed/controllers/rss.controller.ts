import { env } from '@/server/config/env'
import { type RouteHandler } from '@/server/lib/handler'
import { rssService, type RssService } from '@/server/modules/feed/services/rss.service'

export class RssController {
  constructor(private readonly rssService: RssService) {}

  get: RouteHandler = async () => {
    const body = await this.rssService.render(new URL(env.BETTER_AUTH_URL).origin)
    return new Response(body, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }
}

export const rssController = new RssController(rssService)
