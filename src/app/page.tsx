import { type Metadata } from 'next'
import Link from 'next/link'

import { getMessages } from '@/i18n'
import { getServerLocale } from '@/i18n/server'
import { Models } from '@/models'

import { PublicFeed } from '@/features/feed/components/public-feed'
import { PendingSite } from '@/features/home/components/pending-site'
import { ProfileHeader } from '@/features/home/components/profile-header'
import { env } from '@/server/config/env'
import { feedService } from '@/server/modules/feed/services/feed.service'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

export const dynamic = 'force-dynamic'

type HomePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export const generateMetadata = async (): Promise<Metadata> => {
  if ((await installationService.getStatus()) !== 'completed') {
    return { title: 'Blogram', description: 'A personal multimedia journal' }
  }
  const profile = await profileService.getProfile()
  return {
    title: profile?.name ?? 'Blogram',
    description: profile?.description ?? 'A personal multimedia journal',
  }
}

const Page = async ({ searchParams }: HomePageProps = {}) => {
  const status = await installationService.getStatus()
  if (status === 'pending') {
    return <PendingSite />
  }

  const profile = await profileService.getProfile()
  if (!profile) {
    return <PendingSite />
  }

  const query = await searchParams
  const filter = Models.toFeedFilter(query?.type)
  const locale = await getServerLocale()
  const messages = getMessages(locale)
  const page = await feedService.list({
    type: filter,
    page: Models.toFeedPage(query?.page),
    pageSize: 12,
  })

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-10 sm:mb-14">
        <ProfileHeader
          name={profile.name}
          description={profile.description}
          photoSrc={profile.hasPhoto ? Models.PROFILE_PHOTO_PATH : null}
        />
      </div>
      <PublicFeed
        page={page}
        filter={filter}
        owner={profile.name}
        origin={new URL(env.BETTER_AUTH_URL).origin}
        locale={locale}
        messages={messages}
      />
      <footer className="mx-auto mt-16 flex max-w-2xl flex-wrap items-center justify-between gap-3 border-t border-border/20 py-6 text-xs text-muted-foreground">
        <p>
          {messages['feed.builtWith']}{' '}
          <a
            href="https://github.com/tiago-o-pinheiro/blogram"
            className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            Blogram
          </a>
        </p>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {messages['feed.owner']}
        </Link>
      </footer>
    </main>
  )
}

export default Page
