import Link from 'next/link'

import { cn } from '@/design-system/ui/lib/cn'
import { type Messages, createTranslator } from '@/i18n'
import { type Models } from '@/models'

type PostPagerProps = {
  adjacent: Models.AdjacentPosts
  messages: Messages
}

type PagerLinkProps = {
  summary: Models.PostSummary
  direction: string
  fallbackTitle: string
  isOlder: boolean
}

const PagerLink = ({ summary, direction, fallbackTitle, isOlder }: PagerLinkProps) => (
  <Link
    href={`/posts/${summary.id}`}
    className={cn(
      'flex min-h-11 flex-1 press animate-rise-in flex-col gap-1 rounded-xl border border-line-strong px-4 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
      isOlder && 'items-end text-right',
    )}
  >
    <span className="text-xs text-muted-foreground">
      {isOlder ? `${direction} →` : `← ${direction}`}
    </span>
    <span className="line-clamp-2 text-sm font-medium">{summary.title || fallbackTitle}</span>
  </Link>
)

export const PostPager = ({ adjacent, messages }: PostPagerProps) => {
  const t = createTranslator(messages)
  if (!adjacent.newer && !adjacent.older) {
    return null
  }
  return (
    <nav aria-label={t('pager.label')} className="flex flex-wrap gap-3">
      {adjacent.newer ? (
        <PagerLink
          summary={adjacent.newer}
          direction={t('pager.newer')}
          fallbackTitle={t(`feed.${adjacent.newer.type}`)}
          isOlder={false}
        />
      ) : null}
      {adjacent.older ? (
        <PagerLink
          summary={adjacent.older}
          direction={t('pager.older')}
          fallbackTitle={t(`feed.${adjacent.older.type}`)}
          isOlder
        />
      ) : null}
    </nav>
  )
}
