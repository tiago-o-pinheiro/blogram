import { and, desc, eq, isNotNull } from 'drizzle-orm'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { toPostSummary } from '@/server/modules/feed/services/archive.service'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { toPost } from '@/server/modules/posts/services/to-post'

const PLACE_POST_LIMIT = 500

export class PlacePinService {
  list = async (): Promise<Models.PlacePin[]> => {
    const rows = await db
      .select({ post, media })
      .from(post)
      .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
      .where(and(eq(post.status, 'published'), isNotNull(post.place)))
      .orderBy(desc(post.publishedAt), desc(post.id))
      .limit(PLACE_POST_LIMIT)
    const pins = new Map<string, Models.PlacePin>()
    for (const row of rows) {
      const record = toPost(row)
      if (!record.place) {
        continue
      }
      const coordinates = Models.readPlaceCoordinates(record.place.mapUrl)
      const key = `${record.place.name}|${coordinates?.lat ?? ''}|${coordinates?.lon ?? ''}`
      const summary = toPostSummary(record)
      const pin = pins.get(key)
      if (pin) {
        pin.posts.push(summary)
      } else {
        pins.set(key, { name: record.place.name, coordinates, posts: [summary] })
      }
    }
    return [...pins.values()]
  }
}

export const placePinService = new PlacePinService()
