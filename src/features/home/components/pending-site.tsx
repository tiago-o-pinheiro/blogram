'use client'

import { useT } from '@/i18n/i18n-context'

export const PendingSite = () => {
  const t = useT()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">{t('home.pending.title')}</h1>
      <p className="text-muted-foreground">{t('home.pending.description')}</p>
    </main>
  )
}
