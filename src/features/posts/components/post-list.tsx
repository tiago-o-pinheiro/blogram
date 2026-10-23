'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { buttonVariants } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { DeletePostDialog } from './delete-post-dialog'
import { toImageSrc } from '../lib/to-image-src'

type PostListProps = {
  page: Models.PostPage
  status?: string
}

const LINK_CLASS =
  'inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm underline focus-visible:outline-2 focus-visible:outline-ring'

export const PostList = ({ page, status }: PostListProps) => {
  const t = useT()
  const router = useRouter()
  const { total, page: currentPage, pageSize } = page.meta
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const toPageHref = (target: number): string => {
    const params = new URLSearchParams({ page: String(target) })
    if (status) {
      params.set('status', status)
    }
    return `?${params.toString()}`
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted-foreground">{t('postList.empty')}</p>
        <Link href="/admin/posts/new" className={buttonVariants()}>
          {t('postList.emptyAction')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-4">
        {page.data.map((post) => (
          <li
            key={post.id}
            className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center"
          >
            <div
              className="w-full overflow-hidden rounded-md bg-muted sm:w-32 sm:shrink-0"
              style={{
                aspectRatio: post.image ? `${post.image.width} / ${post.image.height}` : '1',
              }}
            >
              {post.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- served by the media route, not the Next image optimizer
                <img
                  src={toImageSrc(post.image, 480)}
                  alt={t('postList.thumbnailAlt')}
                  className="size-full object-cover"
                />
              ) : post.youtube ? (
                <Image
                  unoptimized
                  src={post.youtube.thumbnailUrl}
                  width={480}
                  height={360}
                  alt={t('postList.thumbnailAlt')}
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  {t('postList.noImage')}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 text-sm">
              <p className="font-medium">{t(`posts.type.${post.type}`)}</p>
              <p>{t(`posts.status.${post.status}`)}</p>
              <p className="text-muted-foreground">
                <time dateTime={post.publishedAt ?? post.createdAt}>
                  {(post.publishedAt ?? post.createdAt).slice(0, 10)}
                </time>
              </p>
              <p className="text-muted-foreground">{t('postList.likes', { count: post.likes })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Link href={`/admin/posts/${post.id}`} className={LINK_CLASS}>
                {t('postList.edit')}
              </Link>
              <Link href={`/admin/posts/${post.id}/preview`} className={LINK_CLASS}>
                {t('postList.preview')}
              </Link>
              <DeletePostDialog post={post} onDeleted={() => router.refresh()} />
            </div>
          </li>
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
    </div>
  )
}
