import { type Metadata } from 'next'

import { getMessages } from '@/i18n'
import { getServerLocale } from '@/i18n/server'
import { Models } from '@/models'

import { ArchiveView } from '@/features/archive/components/archive-view'
import { PendingSite } from '@/features/home/components/pending-site'
import { archiveService } from '@/server/modules/feed/services/archive.service'
import { installationService } from '@/server/modules/installation/services/installation.service'

export const dynamic = 'force-dynamic'

type ArchivePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export const generateMetadata = async (): Promise<Metadata> => {
  const messages = getMessages(await getServerLocale())
  return { title: messages['archive.title'] }
}

const Page = async ({ searchParams }: ArchivePageProps = {}) => {
  if ((await installationService.getStatus()) !== 'completed') {
    return <PendingSite />
  }

  const query = await searchParams
  const locale = await getServerLocale()
  const archive = await archiveService.get(Models.toArchiveYear(query?.year))

  return (
    <main className="mx-auto min-h-dvh max-w-5xl animate-fade-in px-4 pt-6 pb-8 sm:px-8 sm:py-12">
      <ArchiveView archive={archive} locale={locale} messages={getMessages(locale)} />
    </main>
  )
}

export default Page
