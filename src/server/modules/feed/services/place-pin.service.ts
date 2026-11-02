import { and, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { toPostSummary } from '@/server/modules/feed/services/to-post-summary'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { toPost } from '@/server/modules/posts/services/to-post'

const name = sql<string>`${post.place}->>'name'`
const mapUrl = sql<string | null>`${post.place}->>'mapUrl'`

export class PlacePinService {
  list = async (): Promise<Models.PlacePin[]> => {
    const groups = await db
      .select({
        name,
        mapUrl,
        count: count(),
        coverId: sql<
          string | null
        >`(array_agg(${post.id} order by ${post.publishedAt} desc, ${post.id} desc)
          filter (where ${media.id} is not null or ${post.details}->>'thumbnailUrl' is not null))[1]`,
      })
      .from(post)
      .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
      .where(and(eq(post.status, 'published'), isNotNull(post.place), isNotNull(name)))
      .groupBy(name, mapUrl)
      .orderBy(desc(sql`max(${post.publishedAt})`), name, mapUrl)

    const coverIds = groups.flatMap((group) => (group.coverId ? [group.coverId] : []))
    const covers =
      coverIds.length > 0
        ? await db
            .select({ post, media })
            .from(post)
            .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
            .where(inArray(post.id, coverIds))
            .orderBy(desc(post.publishedAt), desc(post.id))
        : []
    const coverRank = new Map(covers.map((row, index) => [row.post.id, index]))
    const coverById = new Map(covers.map((row) => [row.post.id, toPostSummary(toPost(row))]))
    const pins = new Map<string, Models.PlacePin>()
    const pinCoverRanks = new Map<string, number>()

    for (const group of groups) {
      const coordinates = Models.readPlaceCoordinates(group.mapUrl ?? undefined)
      const key = Models.toFeedPlaceKey({ name: group.name, coordinates })
      const rank = group.coverId ? (coverRank.get(group.coverId) ?? Infinity) : Infinity
      const cover = group.coverId ? (coverById.get(group.coverId) ?? null) : null
      const pin = pins.get(key)
      if (pin) {
        pin.count += group.count
        if (rank < (pinCoverRanks.get(key) ?? Infinity)) {
          pin.cover = cover
          pinCoverRanks.set(key, rank)
        }
      } else {
        pins.set(key, { name: group.name, coordinates, place: key, count: group.count, cover })
        pinCoverRanks.set(key, rank)
      }
    }
    return [...pins.values()]
  }
}

export const placePinService = new PlacePinService()
