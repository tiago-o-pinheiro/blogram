import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { GoogleAccount } from '@/features/auth/components/google-account'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'

export const dynamic = 'force-dynamic'

const Page = async () => {
  await requireOwnerPage()
  const t = await getServerTranslator()

  return (
    <PageShell title={t('adminShell.account')}>
      <section
        className="flex flex-col gap-5 rounded-xl border border-border/20 bg-card p-5"
        aria-labelledby="password-title"
      >
        <h2 id="password-title" className="text-lg font-semibold">
          {t('account.title')}
        </h2>
        <ChangePasswordForm />
      </section>
      <GoogleAccount />
      <section className="flex flex-col gap-3 rounded-xl border border-border/20 bg-card p-5">
        <h2 className="text-lg font-semibold">{t('account.session')}</h2>
        <p className="text-sm text-muted-foreground">{t('account.sessionHint')}</p>
        <SignOutButton />
      </section>
    </PageShell>
  )
}

export default Page
