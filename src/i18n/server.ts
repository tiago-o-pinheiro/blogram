import { cookies, headers } from 'next/headers'

import { profileService } from '@/server/modules/profile/services/profile.service'

import { createTranslator, getMessages } from './index'
import { type Locale, type TranslationKey } from './index'
import { resolveLocale } from './resolve-locale'

const LOCALE_COOKIE_NAME = 'blogram_locale'

const getSiteDefaultLocale = async (): Promise<Locale | undefined> => {
  try {
    const settings = await profileService.getSettings()
    return settings.defaultLocale
  } catch {
    return undefined
  }
}

export const getServerLocale = async (): Promise<Locale> => {
  const [cookieStore, headerStore, siteDefault] = await Promise.all([
    cookies(),
    headers(),
    getSiteDefaultLocale(),
  ])
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: headerStore.get('accept-language'),
    siteDefault,
  })
}

export const getServerTranslator = async () => {
  const locale = await getServerLocale()
  return createTranslator<TranslationKey>(getMessages(locale))
}
