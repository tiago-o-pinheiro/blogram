import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

export const LOCALES = ['en', 'es'] as const

export const SiteSettings = Type.Object({
  defaultLocale: Type.Union([Type.Literal('en'), Type.Literal('es')]),
})
export type SiteSettings = Static<typeof SiteSettings>

export const isSiteSettings = (value: unknown): value is SiteSettings =>
  Value.Check(SiteSettings, value)
