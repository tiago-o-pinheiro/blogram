import { sql } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { post } from '@/server/modules/posts/schemas/post.table'

export type MediaVariantRecord = {
  name: string
  key: string
  width: number
  height: number
  contentType: string
}

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('image'),
    key: text('key').notNull(),
    contentType: text('content_type').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    altText: text('alt_text').notNull().default(''),
    variants: jsonb('variants')
      .$type<MediaVariantRecord[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('media_post_role_unique').on(table.postId, table.role)],
)
