import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { Models } from '@/models'

import { NotFoundError, ValidationError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { toPagination, toPaginationMeta } from '@/server/lib/pagination'
import { placePinService } from '@/server/modules/feed/services/place-pin.service'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { postService } from '@/server/modules/posts/services/post.service'
import { toPost } from '@/server/modules/posts/services/to-post'
import {
  AttemptThrottleService,
  type ThrottlePolicy,
} from '@/server/modules/setup/services/attempt-throttle.service'

const video = alias(media, 'video')

const LIKE_WINDOW_SECONDS = 24 * 60 * 60
const LIKE_RATE_POLICY: ThrottlePolicy = {
  scope: 'like:rate',
  clientMaxFailures: 60,
  globalMaxFailures: Number.MAX_SAFE_INTEGER,
  windowSeconds: 15 * 60,
}

const toSearchPattern = (term: string) => `%${term.replace(/[\\%_]/g, '\\$&')}%`

const toSearch = (term?: string) => {
  if (!term) {
    return undefined
  }
  const pattern = toSearchPattern(term)
  return or(
    ilike(post.title, pattern),
    ilike(post.text, pattern),
    ilike(sql`${post.details}->>'title'`, pattern),
    ilike(sql`${post.details}->>'description'`, pattern),
    ilike(sql`${post.details}->>'source'`, pattern),
    ilike(sql`${post.place}->>'name'`, pattern),
  )
}

const toVisibility = (filter: Models.FeedFilter = 'all', term?: string) =>
  and(
    eq(post.status, 'published'),
    filter === 'all'
      ? undefined
      : filter === 'video'
        ? inArray(post.type, ['video', 'youtube'])
        : eq(post.type, filter),
    toSearch(term),
  )

const toPlaceVisibility = async (param?: string) => {
  if (param === undefined) {
    return undefined
  }
  const key = Models.toFeedPlace(param)
  if (!key || !Models.readFeedPlace(key)) {
    throw new ValidationError('Invalid place filter')
  }
  const name = sql<string>`${post.place}->>'name'`
  const mapUrl = sql<string>`coalesce(${post.place}->>'mapUrl', '')`
  const sources = await placePinService.findSources(key)
  return sources.length > 0
    ? or(...sources.map((source) => and(eq(name, source.name), eq(mapUrl, source.mapUrl ?? ''))))
    : sql`false`
}

export class FeedService {
  constructor(private readonly throttle = new AttemptThrottleService()) {}

  list = async (query: Models.FeedQuery): Promise<Models.PostPage> => {
    const visibility = and(toVisibility(query.type, query.q), await toPlaceVisibility(query.place))
    const total = await db.$count(post, visibility)
    const lastPage = Math.max(1, Math.ceil(total / query.pageSize))
    const pageQuery = { ...query, page: total > 0 ? Math.min(query.page, lastPage) : query.page }
    const { take, skip } = toPagination(pageQuery)
    const rows = await db
      .select({ post, media, video })
      .from(post)
      .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
      .leftJoin(video, and(eq(video.postId, post.id), eq(video.role, 'video')))
      .where(visibility)
      .orderBy(desc(post.publishedAt), desc(post.id))
      .limit(take)
      .offset(skip)
    return {
      data: rows.map(toPost),
      meta: toPaginationMeta(total, pageQuery),
    }
  }

  get = async (id: string): Promise<Models.Post> => {
    if (!new RegExp(Models.POST_ID_PATTERN).test(id)) {
      throw new NotFoundError('Post not found')
    }
    const found = await postService.getPost(id)
    if (found.status !== 'published') {
      throw new NotFoundError('Post not found')
    }
    return found
  }

  like = async (id: string, clientKey: string): Promise<Models.PostLikes> => {
    await this.throttle.pruneExpired('like:post:', LIKE_WINDOW_SECONDS)
    await this.throttle.pruneExpired('like:rate:', LIKE_RATE_POLICY.windowSeconds)
    return db.transaction(async (tx) => {
      const hasClaimed = await this.throttle.claim(
        {
          scope: `like:post:${id}`,
          windowSeconds: LIKE_WINDOW_SECONDS,
        },
        clientKey,
        tx,
      )
      if (!hasClaimed) {
        const [currentPost] = await tx
          .select({ likes: post.likes })
          .from(post)
          .where(and(eq(post.publicId, id), eq(post.status, 'published')))
        if (!currentPost) {
          throw new NotFoundError('Post not found')
        }
        return currentPost
      }
      await this.throttle.consume(LIKE_RATE_POLICY, clientKey, tx)
      const [liked] = await tx
        .update(post)
        .set({ likes: sql`${post.likes} + 1` })
        .where(and(eq(post.publicId, id), eq(post.status, 'published')))
        .returning({ likes: post.likes })
      if (!liked) {
        throw new NotFoundError('Post not found')
      }
      return liked
    })
  }
}

export const feedService = new FeedService()
