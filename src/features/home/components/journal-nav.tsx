'use client'

import { Archive, MapPin, Rss } from 'lucide-react'
import Link from 'next/link'

import { useT } from '@/i18n/i18n-context'

const LINK_CLASS =
  'press inline-flex min-h-11 animate-rise-in items-center gap-2 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

export const JournalNav = () => {
  const t = useT()

  return (
    <nav
      aria-label={t('journalNav.label')}
      className="mx-auto mb-6 flex w-full max-w-2xl flex-wrap items-center gap-2 stagger sm:mb-10"
    >
      <Link href="/archive" className={LINK_CLASS}>
        <Archive aria-hidden="true" className="size-4" />
        {t('journalNav.archive')}
      </Link>
      <Link href="/places" className={LINK_CLASS}>
        <MapPin aria-hidden="true" className="size-4" />
        {t('journalNav.places')}
      </Link>
      <a href="/feed.xml" className={LINK_CLASS}>
        <Rss aria-hidden="true" className="size-4" />
        {t('journalNav.rss')}
      </a>
    </nav>
  )
}
