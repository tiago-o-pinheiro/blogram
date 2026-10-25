import { sql } from 'drizzle-orm'
import { boolean, check, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const aiSettings = pgTable(
  'ai_settings',
  {
    id: text('id').primaryKey().default('singleton'),
    isEnabled: boolean('is_enabled').notNull().default(false),
    provider: text('provider', { enum: ['openai', 'anthropic', 'google', 'openrouter'] })
      .notNull()
      .default('openai'),
    model: text('model').notNull().default(''),
    apiKeyCiphertext: text('api_key_ciphertext'),
    apiKeyHint: text('api_key_hint').notNull().default(''),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check('ai_settings_singleton_check', sql`${table.id} = 'singleton'`),
    check(
      'ai_settings_provider_check',
      sql`${table.provider} in ('openai', 'anthropic', 'google', 'openrouter')`,
    ),
  ],
)
