import { type Metadata } from 'next'
import { type ReactNode } from 'react'

import { THEME_CSS } from '@/design-system/tokens/theme'
import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { getServerLocale } from '@/i18n/server'

import { env } from '@/server/config/env'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.BETTER_AUTH_URL),
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  title: { default: 'Blogram', template: '%s | Blogram' },
  description: 'A personal multimedia journal',
  icons: { icon: '/brand/blogram-mark.svg' },
}

type RootLayoutProps = {
  children: ReactNode
}

const RootLayout = async ({ children }: RootLayoutProps) => {
  const locale = await getServerLocale()

  return (
    <html lang={locale}>
      <head>
        <style>{THEME_CSS}</style>
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}

export default RootLayout
