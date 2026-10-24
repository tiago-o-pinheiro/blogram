'use client'

import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { PostPlace } from '@/components/post-place'

type PostPreviewProps = {
  post: Models.Post
}

export const PostPreview = ({ post }: PostPreviewProps) => {
  const t = useT()
  const { image } = post
  const srcSet = image?.variants
    .map((variant) => `${Models.MEDIA_PATH}/${image.id}?variant=${variant.name} ${variant.width}w`)
    .join(', ')

  return (
    <article className="flex flex-col gap-4">
      <p className="w-fit rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground">
        {t(`posts.status.${post.status}`)}
      </p>
      {post.video ? (
        <video
          controls
          preload="metadata"
          playsInline
          poster={image ? `${Models.MEDIA_PATH}/${image.id}` : undefined}
          width={post.video.width}
          height={post.video.height}
          className="max-h-screen w-full rounded-lg"
        >
          <source src={`${Models.MEDIA_PATH}/${post.video.id}`} type={post.video.contentType} />
        </video>
      ) : post.youtube ? (
        <iframe
          title={t('postPreview.youtubeTitle')}
          src={`https://www.youtube-nocookie.com/embed/${post.youtube.videoId}`}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="aspect-video w-full rounded-lg border-0"
        />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by the media route, not the Next image optimizer
        <img
          src={`${Models.MEDIA_PATH}/${image.id}`}
          srcSet={srcSet || undefined}
          sizes="(min-width: 768px) 42rem, 100vw"
          width={image.width}
          height={image.height}
          alt={image.altText}
          className="h-auto w-full rounded-lg"
        />
      ) : (
        <p className="text-muted-foreground">{t('postPreview.noImage')}</p>
      )}
      <PostPlace place={post.place} />
      {post.link ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t(`posts.type.${post.type}`)}
          </p>
          <a
            href={post.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {post.link.title}
          </a>
          {post.link.description ? <p>{post.link.description}</p> : null}
          <p className="text-sm text-muted-foreground">
            {post.link.source || new URL(post.link.url).hostname}
          </p>
        </div>
      ) : null}
      {post.title ? (
        <h2 className="text-2xl font-semibold tracking-tight break-words">{post.title}</h2>
      ) : null}
      <p className={post.text ? 'whitespace-pre-line' : 'text-muted-foreground'}>
        {post.text || t('postPreview.noText')}
      </p>
    </article>
  )
}
