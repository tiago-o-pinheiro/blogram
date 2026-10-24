import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getServerTranslator } from '@/i18n/server'
import { Models } from '@/models'

import { GoogleSignIn } from '@/features/auth/components/google-sign-in'
import { SignInForm } from '@/features/auth/components/sign-in-form'
import { authService } from '@/server/modules/auth/services/auth.service'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

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
  const profile = await profileService.getProfile()
  const query = await searchParams

  return (
    <main className="flex min-h-dvh flex-col bg-surface px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t('feed.home')}
      </Link>
      <div className="flex flex-1 items-center justify-center py-8">
        <section className="flex w-full max-w-sm animate-page-in flex-col gap-6 rounded-xl border border-line bg-card p-6 shadow-sm">
          <header className="flex flex-col items-center gap-3 text-center">
            {profile?.hasPhoto ? (
              <Image
                src={Models.PROFILE_PHOTO_PATH}
                alt=""
                width={128}
                height={128}
                unoptimized
                className="size-16 rounded-full object-cover ring-4 ring-surface"
              />
            ) : profile ? (
              <span
                aria-hidden="true"
                className="flex size-16 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-accent-foreground"
              >
                {profile.name.trim().charAt(0).toUpperCase()}
              </span>
            ) : null}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold">{t('signin.submit')}</h1>
              {profile ? (
                <p className="text-sm text-muted-foreground">
                  {t('signin.subtitle', { name: profile.name })}
                </p>
              ) : null}
            </div>
          </header>
          <SignInForm />
          {isGoogleEnabled ? <GoogleSignIn hasCallbackError={query.google === 'error'} /> : null}
        </section>
      </div>
    </main>
  )
}

export default Page
