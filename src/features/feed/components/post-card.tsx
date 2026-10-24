import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { type Locale, type Messages, createTranslator } from '@/i18n'
import { type Models } from '@/models'

import { PostPlace } from '@/components/post-place'
import { LikeButton } from '@/features/feed/components/like-button'
import { PostMedia } from '@/features/feed/components/post-media'
import { ShareActions } from '@/features/feed/components/share-actions'

type PostCardProps = {
  post: Models.Post
  owner: string
  origin: string
  locale: Locale
  messages: Messages
}

export const PostCard = ({ post, owner, origin, locale, messages }: PostCardProps) => {
  const t = createTranslator(messages)
  const title = post.link?.title || post.text || owner
  const date = post.publishedAt ?? post.createdAt
  return (
    <article className="animate-rise-in overflow-hidden rounded-xl border border-line bg-card shadow-sm transition-shadow hover:shadow-md">
      <header className="flex items-center justify-between gap-3 px-5 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3">
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={t('feed.permalink')}
          >
            <time dateTime={date}>
              {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
                new Date(date),
              )}
            </time>
          </Link>
          <PostPlace place={post.place} />
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {t(`posts.type.${post.type}`)}
        </span>
      </header>
      <PostMedia post={post} />
      {post.link ? (
        <a
          href={post.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block space-y-3 border-b border-line p-5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring"
        >
          <p className="text-xs font-medium break-words text-muted-foreground">
            {post.link.source || new URL(post.link.url).hostname}
          </p>
          <h2 className="text-xl font-semibold tracking-tight break-words">{post.link.title}</h2>
          {post.link.description ? (
            <p className="text-sm leading-relaxed break-words text-muted-foreground">
              {post.link.description}
            </p>
          ) : null}
          <span className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
            {t('feed.visit')}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </a>
      ) : null}
      {post.text ? (
        <p className="px-5 pt-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {post.text}
        </p>
      ) : null}
      <footer className="flex flex-wrap items-start justify-between gap-2 px-2 py-2">
        <LikeButton id={post.id} likes={post.likes} />
        <ShareActions id={post.id} title={title} url={`${origin}/posts/${post.id}`} />
      </footer>
    </article>
  )
}
