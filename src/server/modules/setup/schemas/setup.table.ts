import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const setupSession = pgTable(
  'setup_session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('setup_session_expires_at_idx').on(table.expiresAt)],
)

export const setupAttempt = pgTable('setup_attempt', {
  key: text('key').primaryKey(),
  failures: integer('failures').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
})
