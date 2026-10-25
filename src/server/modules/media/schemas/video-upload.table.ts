import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const videoUpload = pgTable(
  'video_upload',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    multipartId: text('multipart_id').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    status: text('status').notNull().default('pending'),
    width: integer('width'),
    height: integer('height'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('video_upload_created_at_idx').on(table.createdAt)],
)

export type VideoUploadRecord = typeof videoUpload.$inferSelect
