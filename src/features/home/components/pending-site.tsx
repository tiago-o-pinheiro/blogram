'use client'

import { useT } from '@/i18n/i18n-context'

export const PendingSite = () => {
  const t = useT()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center stagger">
      <h1 className="animate-rise-in text-2xl font-semibold">{t('home.pending.title')}</h1>
      <p className="animate-rise-in text-muted-foreground">{t('home.pending.description')}</p>
    </main>
  )
}
