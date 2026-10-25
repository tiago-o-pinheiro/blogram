CREATE TABLE "google_sign_in_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"client_id" text DEFAULT '' NOT NULL,
	"client_secret_ciphertext" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_sign_in_settings_singleton_check" CHECK ("google_sign_in_settings"."id" = 'singleton')
);
