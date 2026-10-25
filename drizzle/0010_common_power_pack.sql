CREATE TABLE "video_upload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"multipart_id" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_upload_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "video_upload_created_at_idx" ON "video_upload" USING btree ("created_at");