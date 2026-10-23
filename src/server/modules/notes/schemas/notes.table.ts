import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const notes = pgTable(
  'notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    body: text().notNull().default(''),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('notes_created_at_idx').on(table.createdAt)],
)
