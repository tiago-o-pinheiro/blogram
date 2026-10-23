import { sql } from 'drizzle-orm'
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const profile = pgTable(
  'profile',
  {
    id: text('id').primaryKey().default('singleton'),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    photoKey: text('photo_key'),
    photoContentType: text('photo_content_type'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check('profile_singleton_check', sql`${table.id} = 'singleton'`)],
)
