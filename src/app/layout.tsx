import { type Metadata } from 'next'
import { type ReactNode } from 'react'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { getServerLocale } from '@/i18n/server'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Blogram', template: '%s | Blogram' },
  description: 'A personal multimedia journal',
}

type RootLayoutProps = {
  children: ReactNode
}

const RootLayout = async ({ children }: RootLayoutProps) => {
  const locale = await getServerLocale()

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}

export default RootLayout
