ALTER TABLE "post" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "post" SET "title" = left(btrim("media"."alt_text"), 300) FROM "media" WHERE "media"."post_id" = "post"."id" AND "media"."role" = 'image' AND "post"."type" IN ('photo', 'video', 'youtube') AND "post"."title" = '' AND btrim("media"."alt_text") <> '';
