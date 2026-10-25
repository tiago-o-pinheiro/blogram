import { sql } from 'drizzle-orm'
import { boolean, check, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const googleSignInSettings = pgTable(
  'google_sign_in_settings',
  {
    id: text('id').primaryKey().default('singleton'),
    isEnabled: boolean('is_enabled').notNull().default(false),
    clientId: text('client_id').notNull().default(''),
    clientSecretCiphertext: text('client_secret_ciphertext'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check('google_sign_in_settings_singleton_check', sql`${table.id} = 'singleton'`)],
)
