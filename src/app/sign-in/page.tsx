import { redirect } from 'next/navigation'

import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { GoogleSignIn } from '@/features/auth/components/google-sign-in'
import { SignInForm } from '@/features/auth/components/sign-in-form'
import { authService } from '@/server/modules/auth/services/auth.service'
import { installationService } from '@/server/modules/installation/services/installation.service'

export const dynamic = 'force-dynamic'

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) => {
  if ((await installationService.getStatus()) === 'pending') {
    redirect('/admin')
  }
  const t = await getServerTranslator()
  const isGoogleEnabled = await authService.isGoogleSignInEnabled()
  const query = await searchParams

  return (
    <PageShell title={t('signin.submit')}>
      <SignInForm />
      {isGoogleEnabled ? <GoogleSignIn hasCallbackError={query.google === 'error'} /> : null}
    </PageShell>
  )
}

export default Page
