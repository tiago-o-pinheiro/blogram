CREATE TABLE "ai_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"api_key_ciphertext" text,
	"api_key_hint" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_settings_singleton_check" CHECK ("ai_settings"."id" = 'singleton'),
	CONSTRAINT "ai_settings_provider_check" CHECK ("ai_settings"."provider" in ('openai', 'anthropic', 'google', 'openrouter'))
);
