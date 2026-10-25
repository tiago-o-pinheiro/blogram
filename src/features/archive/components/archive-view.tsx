import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/design-system/ui/lib/cn'
import { SlidingPill } from '@/design-system/ui/sliding-pill'
import { type Locale, type Messages, createTranslator } from '@/i18n'
import { Models } from '@/models'

type ArchiveViewProps = {
  archive: Models.Archive
  locale: Locale
  messages: Messages
}

const TILE_CLASS =
  'relative flex aspect-square min-h-11 press items-end overflow-hidden rounded-lg border border-line bg-muted focus-visible:outline-2 focus-visible:outline-ring'

const YOUTUBE_THUMBNAIL = { width: 480, height: 360 } as const

export const ArchiveView = ({ archive, locale, messages }: ArchiveViewProps) => {
  const t = createTranslator(messages)
  const formatMonth = (month: string) =>
    new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${month}-01T00:00:00Z`),
    )
  return (
    <section className="mx-auto w-full max-w-5xl space-y-8" aria-labelledby="archive-title">
      <header className="flex animate-rise-in flex-wrap items-center justify-between gap-3">
        <h1 id="archive-title" className="text-2xl font-semibold">
          {t('archive.title')}
        </h1>
        <Link
          href="/"
          className="inline-flex min-h-11 press items-center rounded-full border border-line-strong px-5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t('archive.back')}
        </Link>
      </header>
      {archive.year === null ? (
        <div className="animate-rise-in rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t('archive.empty')}</p>
        </div>
      ) : (
        <>
          <nav
            aria-label={t('archive.years')}
            className="relative scrollbar-none flex animate-rise-in gap-1 overflow-x-auto rounded-full glass p-1"
          >
            <SlidingPill
              activeKey={String(archive.year)}
              className="rounded-full bg-foreground shadow-sm"
            />
            {archive.years.map((entry) => (
              <Link
                key={entry.year}
                href={`/archive?year=${entry.year}`}
                scroll={false}
                aria-current={entry.year === archive.year ? 'page' : undefined}
                data-active={entry.year === archive.year || undefined}
                className={cn(
                  'relative inline-flex min-h-11 shrink-0 press items-center rounded-full px-5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring',
                  entry.year === archive.year
                    ? 'bg-foreground text-background pill-ready:bg-transparent'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {entry.year}
              </Link>
            ))}
          </nav>
          <div key={archive.year} className="space-y-8">
            {archive.months.map((month) => (
              <section
                key={month.month}
                aria-label={formatMonth(month.month)}
                className="animate-rise-in space-y-3"
              >
                <h2 className="text-lg font-medium capitalize">{formatMonth(month.month)}</h2>
                <ul className="grid grid-cols-2 gap-3 stagger sm:grid-cols-3 md:grid-cols-4">
                  {month.posts.map((summary) => {
                    const label = summary.title || t(`feed.${summary.type}`)
                    return (
                      <li key={summary.id} className="animate-rise-in">
                        <Link
                          href={`/posts/${summary.id}`}
                          aria-label={label}
                          className={TILE_CLASS}
                        >
                          {summary.image ? (
                            <Image
                              src={`${Models.MEDIA_PATH}/${summary.image.id}?variant=w480`}
                              width={summary.image.width}
                              height={summary.image.height}
                              alt=""
                              unoptimized
                              className="absolute inset-0 size-full object-cover transition-transform hover:scale-105"
                            />
                          ) : summary.thumbnailUrl ? (
                            <span className="absolute inset-0 scale-150">
                              <Image
                                src={summary.thumbnailUrl}
                                width={YOUTUBE_THUMBNAIL.width}
                                height={YOUTUBE_THUMBNAIL.height}
                                alt=""
                                unoptimized
                                className="size-full animate-fade-in object-cover transition-transform hover:scale-105"
                              />
                            </span>
                          ) : (
                            <span className="line-clamp-4 p-3 text-sm font-medium">{label}</span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
