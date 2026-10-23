import { notFound } from 'next/navigation'

import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { LanguageForm } from '@/features/profile/components/language-form'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'
import { profileService } from '@/server/modules/profile/services/profile.service'

export const dynamic = 'force-dynamic'

const Page = async () => {
  await requireOwnerPage()
  const [t, profile, settings] = await Promise.all([
    getServerTranslator(),
    profileService.getProfile(),
    profileService.getSettings(),
  ])

  if (!profile) {
    notFound()
  }

  return (
    <PageShell title={t('adminShell.profile')}>
      <ProfileForm profile={profile} />
      <LanguageForm settings={settings} />
    </PageShell>
  )
}

export default Page
