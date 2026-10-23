import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { SetupWizard } from '@/features/setup/components/setup-wizard'
import { setupService } from '@/server/modules/setup/services/setup.service'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const requestHeaders = await headers()
  const entry = await setupService.resolveEntry(requestHeaders)

  if (entry === 'completed') {
    notFound()
  }
  if (entry !== 'wizard') {
    redirect('/admin')
  }

  const [state, t] = await Promise.all([
    setupService.getState(requestHeaders),
    getServerTranslator(),
  ])

  return (
    <PageShell title={t('wizard.title')}>
      <SetupWizard initialState={{ profile: state.profile }} />
    </PageShell>
  )
}

export default Page
