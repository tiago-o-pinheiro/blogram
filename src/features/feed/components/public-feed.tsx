import { MapPin, X } from 'lucide-react'
import Link from 'next/link'

import { type Locale, type Messages, createTranslator } from '@/i18n'
import { Models } from '@/models'

import { FeedFilterBar } from '@/features/feed/components/feed-filter-bar'
import { PostCard } from '@/features/feed/components/post-card'

type PublicFeedProps = {
  page: Models.PostPage
  filter: Models.FeedFilter
  query?: string
  place?: string
  owner: string
  origin: string
  locale: Locale
  messages: Messages
}

export const PublicFeed = ({
  page,
  filter,
  query,
  place,
  owner,
  origin,
  locale,
  messages,
}: PublicFeedProps) => {
  const t = createTranslator(messages)
  const scope = { q: query, place }
  const selectedPlace = place ? Models.readFeedPlace(place) : undefined
  const hasPrevious = page.meta.page > 1
  const hasNext = page.meta.page * page.meta.pageSize < page.meta.total
  return (
    <section className="mx-auto w-full max-w-2xl space-y-8" aria-label={t('feed.label')}>
      {selectedPlace ? (
        <div
          key={place}
          className="flex w-fit animate-scale-in items-center gap-2 rounded-full border border-line bg-card py-1 pr-1 pl-4 transition"
        >
          <span className="flex animate-fade-in items-center gap-1 text-sm">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {selectedPlace.name}
          </span>
          <Link
            href={Models.toFeedHref(filter, 1, { q: query })}
            aria-label={t('feed.clearPlace')}
            title={t('feed.clearPlace')}
            className="inline-flex size-11 press animate-scale-in items-center justify-center rounded-full transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : null}
      {query ? (
        <h2 key={query} className="animate-rise-in text-lg font-medium">
          {t('search.results', { query })}
        </h2>
      ) : null}
      <FeedFilterBar filter={filter} query={query} place={place} />
      {page.data.length === 0 && query ? (
        <div
          key={`empty-${query}`}
          className="animate-rise-in space-y-3 rounded-xl border border-dashed border-line-strong px-6 py-16 text-center"
        >
          <p className="text-sm text-muted-foreground">{t('search.empty', { query })}</p>
        </div>
      ) : page.data.length === 0 ? (
        <div className="animate-rise-in space-y-3 rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <h2 className="text-lg font-medium">{t('feed.empty')}</h2>
          <p className="text-sm text-muted-foreground">{t('feed.emptyHint')}</p>
        </div>
      ) : (
        <div
          key={`${filter}-${query ?? ''}-${place ?? ''}-${page.meta.page}`}
          className="space-y-8 stagger"
        >
          {page.data.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              owner={owner}
              origin={origin}
              locale={locale}
              messages={messages}
            />
          ))}
        </div>
      )}
      {hasPrevious || hasNext ? (
        <nav aria-label={t('feed.pagination')} className="flex flex-wrap justify-between gap-3">
          {hasPrevious ? (
            <Link
              href={Models.toFeedHref(filter, page.meta.page - 1, scope)}
              className="inline-flex min-h-11 press animate-rise-in items-center rounded-full border border-line-strong px-5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t('feed.previous')}
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              href={Models.toFeedHref(filter, page.meta.page + 1, scope)}
              className="inline-flex min-h-11 press animate-rise-in items-center rounded-full border border-line-strong px-5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t('feed.next')}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  )
}
