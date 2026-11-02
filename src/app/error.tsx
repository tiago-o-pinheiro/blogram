'use client'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'

type ErrorPageProps = {
  reset: () => void
}

const ErrorPage = ({ reset }: ErrorPageProps) => {
  const t = useT()

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl animate-page-in flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t('errors.page.title')}</h1>
      <p className="text-muted-foreground">{t('errors.page.description')}</p>
      <Button onClick={reset}>{t('errors.page.retry')}</Button>
    </main>
  )
}

export default ErrorPage
