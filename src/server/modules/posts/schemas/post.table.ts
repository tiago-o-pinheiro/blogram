import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const post = pgTable(
  'post',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull().unique(),
    type: text('type', { enum: ['photo', 'video', 'youtube', 'link', 'news'] }).notNull(),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    title: text('title').notNull().default(''),
    text: text('text').notNull().default(''),
    place: jsonb('place'),
    details: jsonb('details').notNull().default({}),
    likes: integer('likes').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check('post_type_check', sql`${table.type} in ('photo', 'video', 'youtube', 'link', 'news')`),
    check('post_status_check', sql`${table.status} in ('draft', 'published')`),
    check('post_likes_check', sql`${table.likes} >= 0`),
    check(
      'post_published_at_check',
      sql`${table.status} <> 'published' or ${table.publishedAt} is not null`,
    ),
    index('post_status_published_at_idx').on(table.status, table.publishedAt.desc(), table.id),
  ],
)
