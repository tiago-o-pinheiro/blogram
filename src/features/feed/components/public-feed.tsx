import Link from 'next/link'

import { cn } from '@/design-system/ui/lib/cn'
import { type Locale, type Messages, createTranslator } from '@/i18n'
import { Models } from '@/models'

import { PostCard } from '@/features/feed/components/post-card'

type PublicFeedProps = {
  page: Models.PostPage
  filter: Models.FeedFilter
  owner: string
  origin: string
  locale: Locale
  messages: Messages
}

export const PublicFeed = ({ page, filter, owner, origin, locale, messages }: PublicFeedProps) => {
  const t = createTranslator(messages)
  const hasPrevious = page.meta.page > 1
  const hasNext = page.meta.page * page.meta.pageSize < page.meta.total
  return (
    <section className="mx-auto w-full max-w-2xl space-y-8" aria-label={t('feed.label')}>
      <nav
        aria-label={t('feed.filters')}
        className="sticky top-3 z-10 flex justify-start gap-1 overflow-x-auto rounded-full glass p-1 sm:justify-center"
      >
        {Models.FEED_FILTERS.map((type) => (
          <Link
            key={type}
            href={Models.toFeedHref(type)}
            scroll={false}
            aria-current={filter === type ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none sm:px-5',
              filter === type
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t(`feed.${type}`)}
          </Link>
        ))}
      </nav>
      {page.data.length === 0 ? (
        <div className="animate-rise-in space-y-3 rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <h2 className="text-lg font-medium">{t('feed.empty')}</h2>
          <p className="text-sm text-muted-foreground">{t('feed.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-8 stagger">
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
              href={Models.toFeedHref(filter, page.meta.page - 1)}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t('feed.previous')}
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              href={Models.toFeedHref(filter, page.meta.page + 1)}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t('feed.next')}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  )
}
