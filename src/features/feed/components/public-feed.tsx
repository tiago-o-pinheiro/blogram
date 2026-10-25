import Link from 'next/link'

import { cn } from '@/design-system/ui/lib/cn'
import { SlidingPill } from '@/design-system/ui/sliding-pill'
import { type Locale, type Messages, createTranslator } from '@/i18n'
import { Models } from '@/models'

import { FeedSearch } from '@/features/feed/components/feed-search'
import { PostCard } from '@/features/feed/components/post-card'

type PublicFeedProps = {
  page: Models.PostPage
  filter: Models.FeedFilter
  query?: string
  owner: string
  origin: string
  locale: Locale
  messages: Messages
}

export const PublicFeed = ({
  page,
  filter,
  query,
  owner,
  origin,
  locale,
  messages,
}: PublicFeedProps) => {
  const t = createTranslator(messages)
  const scope = { q: query }
  const hasPrevious = page.meta.page > 1
  const hasNext = page.meta.page * page.meta.pageSize < page.meta.total
  return (
    <section className="mx-auto w-full max-w-2xl space-y-8" aria-label={t('feed.label')}>
      <FeedSearch query={query} filter={filter} messages={messages} />
      {query ? (
        <h2 key={query} className="animate-rise-in text-lg font-medium">
          {t('search.results', { query })}
        </h2>
      ) : null}
      <nav
        aria-label={t('feed.filters')}
        className="sticky top-3 z-10 flex animate-rise-in justify-start gap-1 overflow-x-auto rounded-full glass p-1 sm:justify-center"
      >
        <SlidingPill activeKey={filter} className="rounded-full bg-foreground shadow-sm" />
        {Models.FEED_FILTERS.map((type) => (
          <Link
            key={type}
            href={Models.toFeedHref(type, 1, scope)}
            scroll={false}
            aria-current={filter === type ? 'page' : undefined}
            data-active={filter === type || undefined}
            className={cn(
              'relative inline-flex min-h-11 shrink-0 press items-center rounded-full px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring sm:px-5',
              filter === type
                ? 'bg-foreground text-background pill-ready:bg-transparent'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t(`feed.${type}`)}
          </Link>
        ))}
      </nav>
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
        <div key={`${filter}-${query ?? ''}-${page.meta.page}`} className="space-y-8 stagger">
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
