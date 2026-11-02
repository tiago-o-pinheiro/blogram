import { type Metadata } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@/design-system/ui/button'
import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) => {
  const t = await getServerTranslator()
  const { token, error } = await searchParams
  const hasToken = typeof token === 'string' && token.length > 0 && !error

  return (
    <PageShell title={t('recovery.reset')} description={t('recovery.resetDescription')}>
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6 transition">
        {hasToken ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex animate-rise-in flex-col gap-4">
            <p role="alert">{t('recovery.invalid')}</p>
            <Link href="/forgot-password" className={buttonVariants()}>
              {t('recovery.retry')}
            </Link>
          </div>
        )}
      </section>
    </PageShell>
  )
}

export default Page
