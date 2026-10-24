'use client'

import { ExternalLink, FileText, Pencil, Send, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button, buttonVariants } from '@/design-system/ui/button'
import { cn } from '@/design-system/ui/lib/cn'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { DeletePostDialog } from './delete-post-dialog'
import { PostStatusBadge } from './post-status-badge'
import { PostsApiError, setPostStatus } from '../api/posts-api'
import { toImageSrc } from '../lib/to-image-src'
import { toPostsMessageKey } from '../lib/to-posts-message'

type PostListProps = {
  page: Models.PostPage
  status?: string
}

type StatusFilter = {
  href: string
  status?: Models.PostStatus
  labelKey: TranslationKey
}

const STATUS_FILTERS: readonly StatusFilter[] = [
  { href: '/admin/posts', labelKey: 'postList.filterAll' },
  { href: '/admin/posts?status=draft', status: 'draft', labelKey: 'postList.filterDrafts' },
  {
    href: '/admin/posts?status=published',
    status: 'published',
    labelKey: 'postList.filterPublished',
  },
]

const LINK_CLASS =
  'inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm underline focus-visible:outline-2 focus-visible:outline-ring'

const PostThumbnail = ({ post }: { post: Models.Post }) => {
  const t = useT()
  if (post.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- served by the media route, not the Next image optimizer
      <img
        src={toImageSrc(post.image, 480)}
        alt={t('postList.thumbnailAlt')}
        className="size-16 shrink-0 rounded-md bg-muted object-cover"
      />
    )
  }
  if (post.youtube) {
    return (
      <Image
        unoptimized
        src={post.youtube.thumbnailUrl}
        width={480}
        height={360}
        alt={t('postList.thumbnailAlt')}
        className="size-16 shrink-0 rounded-md bg-muted object-cover"
      />
    )
  }
  return (
    <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <FileText aria-hidden="true" className="size-5" />
      <span className="sr-only">{t('postList.noImage')}</span>
    </span>
  )
}

const PostRow = ({ post }: { post: Models.Post }) => {
  const t = useT()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const date = post.publishedAt ?? post.createdAt

  const handlePublish = async () => {
    setErrorKey(null)
    setIsPending(true)
    try {
      await setPostStatus(post.id, 'published')
    } catch (error) {
      setErrorKey(
        error instanceof PostsApiError ? toPostsMessageKey(error.status) : 'posts.error.generic',
      )
      setIsPending(false)
      return
    }
    setIsPending(false)
    router.refresh()
  }

  return (
    <li className="flex animate-rise-in gap-3 p-4 transition-colors hover:bg-surface">
      <PostThumbnail post={post} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {post.link?.title || post.text || post.image?.altText || t(`posts.type.${post.type}`)}
          </p>
          <PostStatusBadge status={post.status} label={t(`posts.status.${post.status}`)} />
        </div>
        <p className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
          <span>{t(`posts.type.${post.type}`)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={date}>{date.slice(0, 10)}</time>
          <span aria-hidden="true">·</span>
          <span>{t('postList.likes', { count: post.likes })}</span>
        </p>
        {errorKey ? (
          <p role="alert" className="text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}
        <div className="mt-1 flex items-center gap-1">
          <Link
            href={`/admin/posts/${post.id}`}
            aria-label={t('postList.edit')}
            title={t('postList.edit')}
            className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }), 'rounded-full')}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Link>
          {post.status === 'draft' ? (
            <Button
              variant="accent"
              size="icon"
              className="rounded-full"
              aria-label={t('postList.publish')}
              title={t('postList.publish')}
              isLoading={isPending}
              loadingLabel={t('postList.publishing')}
              onClick={() => void handlePublish()}
            >
              <Send aria-hidden="true" className="size-4" />
            </Button>
          ) : (
            <Link
              href={`/posts/${post.id}`}
              aria-label={t('postList.view')}
              title={t('postList.view')}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
            >
              <ExternalLink aria-hidden="true" className="size-4" />
            </Link>
          )}
          <DeletePostDialog
            post={post}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger"
                aria-label={t('postList.delete')}
                title={t('postList.delete')}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            }
            onDeleted={() => router.refresh()}
          />
        </div>
      </div>
    </li>
  )
}

export const PostList = ({ page, status }: PostListProps) => {
  const t = useT()
  const { total, page: currentPage, pageSize } = page.meta
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const toPageHref = (target: number): string => {
    const params = new URLSearchParams({ page: String(target) })
    if (status) {
      params.set('status', status)
    }
    return `?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label={t('postList.filterLabel')}
        className="flex gap-1 rounded-full glass p-1 sm:w-fit"
      >
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.status === status ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
              filter.status === status
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t(filter.labelKey)}
          </Link>
        ))}
      </nav>
      {total === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">{t('postList.empty')}</p>
          <Link href="/admin/posts/new" className={buttonVariants()}>
            {t('postList.emptyAction')}
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-card stagger">
            {page.data.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </ul>
          <nav aria-label={t('postList.pagination')} className="flex items-center justify-between">
            {currentPage > 1 ? (
              <Link href={toPageHref(Math.min(currentPage - 1, pageCount))} className={LINK_CLASS}>
                {t('postList.previous')}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">
              {t('postList.pageOf', { page: currentPage, pages: pageCount })}
            </span>
            {currentPage < pageCount ? (
              <Link href={toPageHref(currentPage + 1)} className={LINK_CLASS}>
                {t('postList.next')}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </div>
  )
}
