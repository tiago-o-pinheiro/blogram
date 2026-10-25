import enAccount from './en/account.json'
import enAdmin from './en/admin.json'
import enCommon from './en/common.json'
import enDiscover from './en/discover.json'
import enFeed from './en/feed.json'
import enFinalize from './en/finalize.json'
import enGoogle from './en/google.json'
import enMediaField from './en/mediaField.json'
import enPostForm from './en/postForm.json'
import enPostList from './en/postList.json'
import enPostPreview from './en/postPreview.json'
import enSignin from './en/signin.json'
import enUnlock from './en/unlock.json'
import enWizard from './en/wizard.json'
import esAccount from './es/account.json'
import esAdmin from './es/admin.json'
import esCommon from './es/common.json'
import esDiscover from './es/discover.json'
import esFeed from './es/feed.json'
import esFinalize from './es/finalize.json'
import esGoogle from './es/google.json'
import esMediaField from './es/mediaField.json'
import esPostForm from './es/postForm.json'
import esPostList from './es/postList.json'
import esPostPreview from './es/postPreview.json'
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
  ...enFeed,
  ...enDiscover,
  ...enGoogle,
  ...enAdmin,
  ...enMediaField,
  ...enPostList,
  ...enPostForm,
  ...enPostPreview,
}

const es: Readonly<Record<keyof typeof en, string>> = {
  ...esCommon,
  ...esSignin,
  ...esAccount,
  ...esUnlock,
  ...esWizard,
  ...esFinalize,
  ...esFeed,
  ...esDiscover,
  ...esGoogle,
  ...esAdmin,
  ...esMediaField,
  ...esPostList,
  ...esPostForm,
  ...esPostPreview,
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
