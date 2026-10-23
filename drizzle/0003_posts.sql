CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"role" text DEFAULT 'image' NOT NULL,
	"key" text NOT NULL,
	"content_type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_post_role_unique" UNIQUE("post_id","role")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "post_type_check" CHECK ("post"."type" in ('photo', 'video', 'youtube', 'link', 'news')),
	CONSTRAINT "post_status_check" CHECK ("post"."status" in ('draft', 'published')),
	CONSTRAINT "post_likes_check" CHECK ("post"."likes" >= 0),
	CONSTRAINT "post_published_at_check" CHECK ("post"."status" <> 'published' or "post"."published_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "default_locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_status_published_at_idx" ON "post" USING btree ("status","published_at" DESC NULLS LAST,"id");--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_default_locale_check" CHECK ("profile"."default_locale" in ('en', 'es'));