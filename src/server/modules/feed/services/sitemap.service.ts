import { desc, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { post } from '@/server/modules/posts/schemas/post.table'

export type SitemapEntry = { id: string; updatedAt: string }

export class SitemapService {
  list = async (): Promise<SitemapEntry[]> => {
    if ((await installationService.getStatus()) !== 'completed') {
      return []
    }
    const rows = await db
      .select({ id: post.publicId, updatedAt: post.updatedAt })
      .from(post)
      .where(eq(post.status, 'published'))
      .orderBy(desc(post.publishedAt), desc(post.id))
    return rows.map((row) => ({ id: row.id, updatedAt: row.updatedAt.toISOString() }))
  }
}

export const sitemapService = new SitemapService()
