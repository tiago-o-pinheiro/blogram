import enAccount from './en/account.json'
import enCommon from './en/common.json'
import enFinalize from './en/finalize.json'
import enSignin from './en/signin.json'
import enUnlock from './en/unlock.json'
import enWizard from './en/wizard.json'
import esAccount from './es/account.json'
import esCommon from './es/common.json'
import esFinalize from './es/finalize.json'
import esSignin from './es/signin.json'
import esUnlock from './es/unlock.json'
import esWizard from './es/wizard.json'
import { createTranslator } from './translator'

const en = {
  ...enCommon,
  ...enSignin,
  ...enAccount,
  ...enUnlock,
  ...enWizard,
  ...enFinalize,
}

const es: Readonly<Record<keyof typeof en, string>> = {
  ...esCommon,
  ...esSignin,
  ...esAccount,
  ...esUnlock,
  ...esWizard,
  ...esFinalize,
}

export type TranslationKey = keyof typeof en

export const SUPPORTED_LOCALES = ['en', 'es'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export type Messages = Readonly<Record<TranslationKey, string>>

const MESSAGES_BY_LOCALE: Readonly<Record<Locale, Messages>> = { en, es }

export const getMessages = (locale: Locale): Messages => MESSAGES_BY_LOCALE[locale]

export const isLocale = (value: unknown): value is Locale =>
  SUPPORTED_LOCALES.some((locale) => locale === value)

export const t = createTranslator<TranslationKey>(en)

export { createTranslator } from './translator'
export type { Variables } from './translator'
