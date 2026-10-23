import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const mediaCleanup = pgTable(
  'media_cleanup',
  {
    key: text('key').primaryKey(),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('media_cleanup_retry_idx').on(table.attempts, table.createdAt)],
)
