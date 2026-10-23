import { redirect } from 'next/navigation'

import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { SignInForm } from '@/features/auth/components/sign-in-form'
import { installationService } from '@/server/modules/installation/services/installation.service'

export const dynamic = 'force-dynamic'

const Page = async () => {
  if ((await installationService.getStatus()) === 'pending') {
    redirect('/admin')
  }
  const t = await getServerTranslator()

  return (
    <PageShell title={t('signin.submit')}>
      <SignInForm />
    </PageShell>
  )
}

export default Page
