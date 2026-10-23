import { Models } from '@/models'

import { PendingSite } from '@/features/home/components/pending-site'
import { ProfileHeader } from '@/features/home/components/profile-header'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const status = await installationService.getStatus()
  if (status === 'pending') {
    return <PendingSite />
  }

  const profile = await profileService.getProfile()
  if (!profile) {
    return <PendingSite />
  }

  return (
    <main>
      <ProfileHeader
        name={profile.name}
        description={profile.description}
        photoSrc={profile.hasPhoto ? Models.PROFILE_PHOTO_PATH : null}
      />
    </main>
  )
}

export default Page
