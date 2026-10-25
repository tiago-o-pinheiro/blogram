import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'

import { Models } from '@/models'

import { db } from '@/server/lib/db'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { toPost } from '@/server/modules/posts/services/to-post'

const TITLE_GRAPHEMES = 80
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export const toPostSummary = (record: Models.Post): Models.PostSummary => {
  const caption = [...segmenter.segment(record.text.replace(/\s+/g, ' ').trim())]
    .slice(0, TITLE_GRAPHEMES)
    .map((part) => part.segment)
    .join('')
    .trim()
  return {
    id: record.id,
    type: record.type,
    title: Models.toPostTitle(record) || caption,
    publishedAt: record.publishedAt ?? record.createdAt,
    image: record.image,
  }
}

export class ArchiveService {
  get = async (year?: number): Promise<Models.Archive> => {
    const publishedYear = sql<number>`extract(year from ${post.publishedAt} at time zone 'UTC')::int`
    const years = await db
      .select({ year: publishedYear, count: sql<number>`count(*)::int` })
      .from(post)
      .where(eq(post.status, 'published'))
      .groupBy(publishedYear)
      .orderBy(desc(publishedYear))
    const [newest] = years
    if (!newest) {
      return { years: [], year: null, months: [] }
    }
    const selected = years.some((entry) => entry.year === year) && year ? year : newest.year
    const rows = await db
      .select({ post, media })
      .from(post)
      .leftJoin(media, and(eq(media.postId, post.id), eq(media.role, 'image')))
      .where(
        and(
          eq(post.status, 'published'),
          gte(post.publishedAt, new Date(Date.UTC(selected, 0, 1))),
          lt(post.publishedAt, new Date(Date.UTC(selected + 1, 0, 1))),
        ),
      )
      .orderBy(desc(post.publishedAt), desc(post.id))
    const months: Models.ArchiveMonth[] = []
    for (const row of rows) {
      const summary = toPostSummary(toPost(row))
      const month = summary.publishedAt.slice(0, 7)
      const last = months.at(-1)
      if (last?.month === month) {
        last.posts.push(summary)
      } else {
        months.push({ month, posts: [summary] })
      }
    }
    return { years, year: selected, months }
  }
}

export const archiveService = new ArchiveService()
