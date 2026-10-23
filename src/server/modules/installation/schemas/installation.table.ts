import { sql } from 'drizzle-orm'
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { user } from '@/server/modules/auth/schemas/auth.table'

export const installation = pgTable(
  'installation',
  {
    id: text('id').primaryKey().default('singleton'),
    status: text('status', { enum: ['pending', 'completed'] })
      .notNull()
      .default('pending'),
    ownerId: text('owner_id')
      .unique()
      .references(() => user.id),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('installation_singleton_check', sql`${table.id} = 'singleton'`)],
)
