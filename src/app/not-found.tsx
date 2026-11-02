import Link from 'next/link'

import { getServerTranslator } from '@/i18n/server'

const NotFoundPage = async () => {
  const t = await getServerTranslator()

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl animate-page-in flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
      <p className="text-muted-foreground">{t('notFound.description')}</p>
      <Link
        href="/"
        className="inline-flex min-h-11 press items-center rounded-md px-1 font-medium text-primary underline transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {t('notFound.home')}
      </Link>
    </main>
  )
}

export default NotFoundPage
