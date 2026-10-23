import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'

export const dynamic = 'force-dynamic'

const Page = async () => {
  await requireOwnerPage()
  const t = await getServerTranslator()

  return (
    <PageShell title={t('account.title')}>
      <ChangePasswordForm />
    </PageShell>
  )
}

export default Page
