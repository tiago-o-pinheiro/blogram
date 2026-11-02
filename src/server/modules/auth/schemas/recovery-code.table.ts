import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth.table'

export const recoveryCode = pgTable(
  'recovery_code',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => [index('recovery_code_user_id_idx').on(table.userId)],
)
