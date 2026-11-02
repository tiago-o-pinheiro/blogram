import { and, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { groupPlaces, type PlaceGroup } from '@/server/modules/feed/services/group-places'
import { toPostSummary } from '@/server/modules/feed/services/to-post-summary'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { toPost } from '@/server/modules/posts/services/to-post'

const name = sql<string>`${post.place}->>'name'`
const mapUrl = sql<string | null>`${post.place}->>'mapUrl'`

export type PlaceSource = { name: string; mapUrl: string | null }

const toPlaceKey = (group: Pick<PlaceGroup, 'name' | 'coordinates'>): string =>
  Models.toFeedPlaceKey({ name: group.name, coordinates: group.coordinates })

export class PlacePinService {
  private loadGroups = async () => {
    const rows = await db
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
    return groupPlaces(
      rows.map((row) => ({
        ...row,
        coordinates: Models.readPlaceCoordinates(row.mapUrl ?? undefined),
      })),
    )
  }

  list = async (): Promise<Models.PlacePin[]> => {
    const places = await this.loadGroups()
    const coverIds = places.flat().flatMap((group) => (group.coverId ? [group.coverId] : []))
    const covers =
      coverIds.length > 0
        ? await db
            .select({ post, media })
            .from(post)
            .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
            .where(inArray(post.id, coverIds))
            .orderBy(desc(post.publishedAt), desc(post.id))
        : []
    const newestCover = (place: ReadonlyArray<{ coverId: string | null }>) =>
      covers.find((row) => place.some((group) => group.coverId === row.post.id))
    return places.flatMap((place) => {
      const [anchor] = place
      if (!anchor) {
        return []
      }
      const cover = newestCover(place)
      return [
        {
          name: anchor.name,
          coordinates: anchor.coordinates,
          place: toPlaceKey(anchor),
          count: place.reduce((sum, group) => sum + group.count, 0),
          cover: cover ? toPostSummary(toPost(cover)) : null,
        },
      ]
    })
  }

  findSources = async (placeKey: string): Promise<PlaceSource[]> => {
    const places = await this.loadGroups()
    const place = places.find((groups) => groups.some((group) => toPlaceKey(group) === placeKey))
    return (place ?? []).map((group) => ({ name: group.name, mapUrl: group.mapUrl }))
  }
}

export const placePinService = new PlacePinService()
