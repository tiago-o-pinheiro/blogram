import { type MetadataRoute } from 'next'

import { env } from '@/server/config/env'
import { sitemapService } from '@/server/modules/feed/services/sitemap.service'

export const dynamic = 'force-dynamic'

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const origin = new URL(env.BETTER_AUTH_URL).origin
  const posts = await sitemapService.list()
  if (posts.length === 0) {
    return [{ url: origin }, { url: `${origin}/archive` }, { url: `${origin}/places` }]
  }
  return [
    { url: origin, lastModified: posts[0]?.updatedAt },
    { url: `${origin}/archive`, lastModified: posts[0]?.updatedAt },
    { url: `${origin}/places`, lastModified: posts[0]?.updatedAt },
    ...posts.map((entry) => ({
      url: `${origin}/posts/${entry.id}`,
      lastModified: entry.updatedAt,
    })),
  ]
}

export default sitemap
