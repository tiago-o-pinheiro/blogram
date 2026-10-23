import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { Models } from '@/models'

import { NotFoundError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { toPagination, toPaginationMeta } from '@/server/lib/pagination'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { postService } from '@/server/modules/posts/services/post.service'
import { toPost } from '@/server/modules/posts/services/to-post'

const video = alias(media, 'video')

const toVisibility = (filter: Models.FeedFilter = 'all') =>
  and(
    eq(post.status, 'published'),
    filter === 'all'
      ? undefined
      : filter === 'video'
        ? inArray(post.type, ['video', 'youtube'])
        : eq(post.type, filter),
  )

export class FeedService {
  list = async (query: Models.FeedQuery): Promise<Models.PostPage> => {
    const visibility = toVisibility(query.type)
    const { take, skip } = toPagination(query)
    const rows = await db
      .select({ post, media, video })
      .from(post)
      .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
      .leftJoin(video, and(eq(video.postId, post.id), eq(video.role, 'video')))
      .where(visibility)
      .orderBy(desc(post.publishedAt), desc(post.id))
      .limit(take)
      .offset(skip)
    const total = await db.$count(post, visibility)
    return {
      data: rows.map(toPost),
      meta: toPaginationMeta(total, query),
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

  like = async (id: string): Promise<Models.PostLikes> => {
    const [liked] = await db
      .update(post)
      .set({ likes: sql`${post.likes} + 1` })
      .where(and(eq(post.publicId, id), eq(post.status, 'published')))
      .returning({ likes: post.likes })
    if (!liked) {
      throw new NotFoundError('Post not found')
    }
    return liked
  }
}

export const feedService = new FeedService()
