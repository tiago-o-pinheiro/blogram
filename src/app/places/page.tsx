import { type Metadata } from 'next'

import { getMessages } from '@/i18n'
import { getServerLocale } from '@/i18n/server'

import { PendingSite } from '@/features/home/components/pending-site'
import { PlacesView } from '@/features/places/components/places-view'
import { placePinService } from '@/server/modules/feed/services/place-pin.service'
import { installationService } from '@/server/modules/installation/services/installation.service'

export const dynamic = 'force-dynamic'

export const generateMetadata = async (): Promise<Metadata> => {
  const messages = getMessages(await getServerLocale())
  return { title: messages['places.title'] }
}

const Page = async () => {
  if ((await installationService.getStatus()) !== 'completed') {
    return <PendingSite />
  }

  const pins = await placePinService.list()

  return (
    <main className="mx-auto min-h-dvh max-w-5xl animate-fade-in px-4 pt-6 pb-8 sm:px-8 sm:py-12">
      <PlacesView pins={pins} />
    </main>
  )
}

export default Page
