import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { SetupWizard } from '@/features/setup/components/setup-wizard'
import { env } from '@/server/config/env'
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

  const state = await setupService.getState(requestHeaders)

  return (
    <SetupWizard
      initialState={{ profile: state.profile }}
      maxPhotoBytes={env.UPLOAD_MAX_IMAGE_BYTES}
    />
  )
}

export default Page
