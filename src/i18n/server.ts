import { cookies, headers } from 'next/headers'

import { createTranslator, getMessages } from './index'
import { type Locale, type TranslationKey } from './index'
import { resolveLocale } from './resolve-locale'

const LOCALE_COOKIE_NAME = 'blogram_locale'

export const getServerLocale = async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: headerStore.get('accept-language'),
  })
}

export const getServerTranslator = async () => {
  const locale = await getServerLocale()
  return createTranslator<TranslationKey>(getMessages(locale))
}
