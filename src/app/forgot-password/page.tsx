import { type Metadata } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@/design-system/ui/button'
import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'
import { RecoveryCodeForm } from '@/features/auth/components/recovery-code-form'
import { passwordRecoveryService } from '@/server/modules/auth/services/password-recovery.service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const Page = async () => {
  const t = await getServerTranslator()
  const isEmailEnabled = passwordRecoveryService.isEnabled()

  return (
    <PageShell title={t('recovery.title')} description={t('recovery.description')}>
      <div className="flex flex-col gap-4 stagger *:animate-rise-in">
        <section
          aria-labelledby="recovery-code-title"
          className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6 transition"
        >
          <h2 id="recovery-code-title" className="text-lg font-semibold">
            {t('recovery.codes.useTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('recovery.codes.useDescription')}</p>
          <RecoveryCodeForm />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('recovery.identifierHint')}
          </p>
        </section>
        {isEmailEnabled ? (
          <section
            aria-labelledby="recovery-email-title"
            className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6 transition"
          >
            <h2 id="recovery-email-title" className="text-lg font-semibold">
              {t('recovery.emailTitle')}
            </h2>
            <ForgotPasswordForm />
          </section>
        ) : null}
        <details className="rounded-xl border border-line bg-card p-6 transition">
          <summary className="min-h-11 press cursor-pointer rounded-md py-2 font-medium transition focus-visible:outline-2 focus-visible:outline-ring">
            {t('recovery.serverTitle')}
          </summary>
          <div className="flex animate-rise-in flex-col gap-3 pt-3 text-sm text-muted-foreground">
            <p>{t('recovery.serverDescription')}</p>
            <code className="overflow-x-auto rounded-md bg-muted p-3 text-foreground">
              pnpm auth:recover
            </code>
            <p>{t('recovery.serverHint')}</p>
          </div>
        </details>
        <Link href="/sign-in" className={buttonVariants({ variant: 'ghost' })}>
          {t('recovery.back')}
        </Link>
      </div>
    </PageShell>
  )
}

export default Page
