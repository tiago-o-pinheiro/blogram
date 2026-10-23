import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { InstallerError } from '@/features/setup/components/installer-error'
import { UnlockForm } from '@/features/setup/components/unlock-form'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'
import { setupService } from '@/server/modules/setup/services/setup.service'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const entry = await setupService.resolveEntry(await headers())

  if (entry === 'installer-error') {
    return <InstallerError />
  }
  if (entry === 'wizard') {
    redirect('/admin/setup')
  }
  if (entry === 'unlock') {
    const t = await getServerTranslator()
    return (
      <PageShell title={t('unlock.title')} description={t('unlock.description')}>
        <UnlockForm />
      </PageShell>
    )
  }

  await requireOwnerPage()
  redirect('/admin/posts')
}

export default Page
