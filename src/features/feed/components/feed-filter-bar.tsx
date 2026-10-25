'use client'

import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Input } from '@/design-system/ui/input'
import { cn } from '@/design-system/ui/lib/cn'
import { SlidingPill } from '@/design-system/ui/sliding-pill'
import { useT } from '@/i18n/i18n-context'
import { Models } from '@/models'

type FeedFilterBarProps = {
  filter: Models.FeedFilter
  query?: string
}

const CLOSE_LINK_CLASS =
  'inline-flex size-11 shrink-0 press animate-fade-in items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring'

export const FeedFilterBar = ({ filter, query }: FeedFilterBarProps) => {
  const t = useT()
  const [isSearching, setIsSearching] = useState(query !== undefined)
  const [previousQuery, setPreviousQuery] = useState(query)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hasSearched = useRef(false)

  if (query !== previousQuery) {
    setPreviousQuery(query)
    setIsSearching(query !== undefined)
  }

  useEffect(() => {
    if (isSearching) {
      hasSearched.current = true
      return
    }
    if (hasSearched.current) {
      triggerRef.current?.focus()
    }
  }, [isSearching])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const value = new FormData(event.currentTarget).get('q')
    if (typeof value !== 'string' || value.trim() === '') {
      event.preventDefault()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && query === undefined) {
      setIsSearching(false)
    }
  }

  return (
    <div className="sticky top-3 z-10 flex animate-rise-in items-center gap-1 rounded-full glass p-1 transition">
      {isSearching ? (
        <form
          key="search"
          role="search"
          action="/"
          method="get"
          aria-label={t('search.label')}
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-1 items-center gap-1"
        >
          {filter === 'all' ? null : <input type="hidden" name="type" value={filter} />}
          <Input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={Models.FEED_SEARCH_MAX}
            placeholder={t('search.placeholder')}
            aria-label={t('search.label')}
            autoFocus
            onKeyDown={handleKeyDown}
            className="animate-scale-in rounded-full border-transparent bg-transparent"
          />
          {query !== undefined ? (
            <Link
              href={Models.toFeedHref(filter)}
              aria-label={t('search.clear')}
              className={CLOSE_LINK_CLASS}
            >
              <X aria-hidden className="size-5" />
            </Link>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('search.close')}
              onClick={() => setIsSearching(false)}
              className="shrink-0 rounded-full text-muted-foreground"
            >
              <X aria-hidden className="size-5" />
            </Button>
          )}
        </form>
      ) : (
        <>
          <nav
            key="filters"
            aria-label={t('feed.filters')}
            className="relative flex min-w-0 flex-1 justify-start gap-1 overflow-x-auto stagger *:animate-rise-in sm:justify-center"
          >
            <SlidingPill activeKey={filter} className="rounded-full bg-foreground shadow-sm" />
            {Models.FEED_FILTERS.map((type) => (
              <Link
                key={type}
                href={Models.toFeedHref(type, 1)}
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
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('search.open')}
            onClick={() => setIsSearching(true)}
            className="shrink-0 animate-fade-in rounded-full text-muted-foreground"
          >
            <Search aria-hidden className="size-5" />
          </Button>
        </>
      )}
    </div>
  )
}
