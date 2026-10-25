import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm'

import { Models } from '@/models'

import { NotFoundError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { toPost } from '@/server/modules/posts/services/to-post'

const SUMMARY_TITLE_LENGTH = 80
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

const toSummaryTitle = (found: Models.Post): string => {
  const title = Models.toPostTitle(found)
  if (title) {
    return title
  }
  return Array.from(segmenter.segment(found.text), ({ segment }) => segment)
    .slice(0, SUMMARY_TITLE_LENGTH)
    .join('')
}

const toSummary = (found: Models.Post): Models.PostSummary => ({
  id: found.id,
  type: found.type,
  title: toSummaryTitle(found),
  publishedAt: found.publishedAt ?? found.createdAt,
  image: found.image,
})

export class AdjacentPostService {
  get = async (id: string): Promise<Models.AdjacentPosts> => {
    const [current] = await db
      .select({ id: post.id, publishedAt: post.publishedAt })
      .from(post)
      .where(and(eq(post.publicId, id), eq(post.status, 'published')))
    if (!current?.publishedAt) {
      throw new NotFoundError('Post not found')
    }
    const { publishedAt } = current
    const [newer, older] = await Promise.all([
      this.find(
        or(
          gt(post.publishedAt, publishedAt),
          and(eq(post.publishedAt, publishedAt), gt(post.id, current.id)),
        ),
        [asc(post.publishedAt), asc(post.id)],
      ),
      this.find(
        or(
          lt(post.publishedAt, publishedAt),
          and(eq(post.publishedAt, publishedAt), lt(post.id, current.id)),
        ),
        [desc(post.publishedAt), desc(post.id)],
      ),
    ])
    return { newer, older }
  }

  private find = async (
    position: ReturnType<typeof or>,
    order: [ReturnType<typeof asc>, ReturnType<typeof asc>],
  ): Promise<Models.PostSummary | null> => {
    const [row] = await db
      .select({ post, media })
      .from(post)
      .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
      .where(and(eq(post.status, 'published'), position))
      .orderBy(...order)
      .limit(1)
    return row ? toSummary(toPost(row)) : null
  }
}

export const adjacentPostService = new AdjacentPostService()
