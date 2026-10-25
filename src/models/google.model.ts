import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

export const GOOGLE_CLIENT_ID_MAX = 255
export const GOOGLE_CLIENT_ID_PATTERN = '^[A-Za-z0-9._-]+$'
export const GOOGLE_CLIENT_SECRET_MAX = 255
export const GOOGLE_SETTINGS_SOURCES = ['env', 'settings'] as const
export type GoogleSettingsSource = (typeof GOOGLE_SETTINGS_SOURCES)[number]
export const GOOGLE_CALLBACK_PATH = '/api/auth/callback/google'

export const GoogleSignInSettings = Type.Object({
  source: Type.Union([Type.Literal('env'), Type.Literal('settings')]),
  isEnabled: Type.Boolean(),
  clientId: Type.String({ maxLength: GOOGLE_CLIENT_ID_MAX }),
  hasClientSecret: Type.Boolean(),
  redirectUri: Type.String({ minLength: 1 }),
})
export type GoogleSignInSettings = Static<typeof GoogleSignInSettings>

export const GoogleSignInSettingsUpdate = Type.Object({
  isEnabled: Type.Boolean(),
  clientId: Type.Union([
    Type.Literal(''),
    Type.String({
      minLength: 1,
      maxLength: GOOGLE_CLIENT_ID_MAX,
      pattern: GOOGLE_CLIENT_ID_PATTERN,
    }),
  ]),
  clientSecret: Type.Optional(Type.String({ minLength: 1, maxLength: GOOGLE_CLIENT_SECRET_MAX })),
})
export type GoogleSignInSettingsUpdate = Static<typeof GoogleSignInSettingsUpdate>

export const isGoogleSignInSettings = (value: unknown): value is GoogleSignInSettings =>
  Value.Check(GoogleSignInSettings, value)
