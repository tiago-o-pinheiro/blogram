CREATE TABLE "recovery_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "recovery_code_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "recovery_code" ADD CONSTRAINT "recovery_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recovery_code_user_id_idx" ON "recovery_code" USING btree ("user_id");