'use client'

import { createContext, useContext, useMemo } from 'react'
import { type ReactNode } from 'react'

import { createTranslator } from './index'
import { type Locale, type Messages, type TranslationKey, type Variables } from './index'

type I18nValue = {
  locale: Locale
  t: (key: TranslationKey, variables?: Variables) => string
}

type I18nProviderProps = {
  locale: Locale
  messages: Messages
  children: ReactNode
}

const I18nContext = createContext<I18nValue | null>(null)

export const I18nProvider = ({ locale, messages, children }: I18nProviderProps) => {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator<TranslationKey>(messages) }),
    [locale, messages],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useT = (): I18nValue['t'] => {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useT must be used within an I18nProvider')
  }
  return value.t
}

export const useLocale = (): I18nValue['locale'] => {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useLocale must be used within an I18nProvider')
  }
  return value.locale
}
