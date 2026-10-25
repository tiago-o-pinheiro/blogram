import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { ALT_TEXT_MAX, POST_TEXT_MAX, POST_TITLE_MAX, PostType } from './post.model'

export const AI_PROVIDERS = ['openai', 'anthropic', 'google', 'openrouter'] as const
export type AiProvider = (typeof AI_PROVIDERS)[number]

export const AI_MODEL_SUGGESTIONS: Readonly<Record<AiProvider, readonly string[]>> = {
  openai: ['gpt-5.4-nano', 'gpt-5.4-mini'],
  anthropic: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'],
  google: ['gemini-3.5-flash-lite', 'gemini-3.6-flash'],
  openrouter: ['google/gemini-3.5-flash-lite', 'openai/gpt-5.4-nano', 'anthropic/claude-haiku-5.5'],
}

export const AI_MODEL_MAX = 200
export const AI_MODEL_PATTERN = '^[A-Za-z0-9._:/-]+$'
export const AI_API_KEY_MAX = 500
export const AI_PROMPT_MAX = 500
export const AI_FIELDS = ['title', 'altText', 'text'] as const
export type AiField = (typeof AI_FIELDS)[number]
export const AI_FAILURE_REASONS = [
  'auth',
  'rate-limit',
  'model',
  'unavailable',
  'invalid-response',
] as const
export type AiFailureReason = (typeof AI_FAILURE_REASONS)[number]

export const AiProviderName = Type.Union([
  Type.Literal('openai'),
  Type.Literal('anthropic'),
  Type.Literal('google'),
  Type.Literal('openrouter'),
])

export const AiFieldName = Type.Union([
  Type.Literal('title'),
  Type.Literal('altText'),
  Type.Literal('text'),
])

export const AiSettings = Type.Object({
  isEnabled: Type.Boolean(),
  provider: AiProviderName,
  model: Type.String({ maxLength: AI_MODEL_MAX }),
  hasApiKey: Type.Boolean(),
  apiKeyHint: Type.String({ maxLength: 8 }),
})
export type AiSettings = Static<typeof AiSettings>

export const AiSettingsUpdate = Type.Object({
  isEnabled: Type.Boolean(),
  provider: AiProviderName,
  model: Type.Union([
    Type.Literal(''),
    Type.String({ minLength: 1, maxLength: AI_MODEL_MAX, pattern: AI_MODEL_PATTERN }),
  ]),
  apiKey: Type.Optional(Type.String({ minLength: 1, maxLength: AI_API_KEY_MAX })),
})
export type AiSettingsUpdate = Static<typeof AiSettingsUpdate>

export const AiDraftRequest = Type.Object({
  prompt: Type.String({ maxLength: AI_PROMPT_MAX }),
  postType: PostType,
  fields: Type.Array(AiFieldName, { minItems: 1, uniqueItems: true }),
  title: Type.String({ maxLength: POST_TITLE_MAX }),
  altText: Type.String({ maxLength: ALT_TEXT_MAX }),
  text: Type.String({ maxLength: POST_TEXT_MAX }),
  mediaId: Type.Optional(Type.String({ format: 'uuid' })),
})
export type AiDraftRequest = Static<typeof AiDraftRequest>

export const AiDraft = Type.Object({
  title: Type.Optional(Type.String({ maxLength: POST_TITLE_MAX })),
  altText: Type.Optional(Type.String({ maxLength: ALT_TEXT_MAX })),
  text: Type.Optional(Type.String({ maxLength: POST_TEXT_MAX })),
})
export type AiDraft = Static<typeof AiDraft>

export const isAiSettings = (value: unknown): value is AiSettings => Value.Check(AiSettings, value)
export const isAiDraft = (value: unknown): value is AiDraft => Value.Check(AiDraft, value)

export const shouldAttachAiImage = (
  fields: readonly AiField[],
  postType: PostType,
  altText: string,
): boolean =>
  fields.includes('altText') ||
  ((postType === 'photo' || postType === 'video') && altText.trim() === '')
