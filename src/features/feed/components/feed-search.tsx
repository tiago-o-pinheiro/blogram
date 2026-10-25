import Link from 'next/link'

import { Button } from '@/design-system/ui/button'
import { Input } from '@/design-system/ui/input'
import { type Messages, createTranslator } from '@/i18n'
import { Models } from '@/models'

type FeedSearchProps = {
  query?: string
  filter: Models.FeedFilter
  messages: Messages
}

export const FeedSearch = ({ query, filter, messages }: FeedSearchProps) => {
  const t = createTranslator(messages)
  return (
    <form
      action="/"
      method="get"
      role="search"
      aria-label={t('search.label')}
      className="flex animate-rise-in items-center gap-2"
    >
      {filter === 'all' ? null : <input type="hidden" name="type" value={filter} />}
      <Input
        type="search"
        name="q"
        key={query ?? ''}
        defaultValue={query}
        maxLength={Models.FEED_SEARCH_MAX}
        placeholder={t('search.placeholder')}
        aria-label={t('search.label')}
        className="rounded-full"
      />
      <Button type="submit" className="shrink-0 rounded-full">
        {t('search.submit')}
      </Button>
      {query ? (
        <Link
          href={Models.toFeedHref(filter)}
          className="inline-flex min-h-11 shrink-0 press animate-fade-in items-center rounded-full px-3 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t('search.clear')}
        </Link>
      ) : null}
    </form>
  )
}
