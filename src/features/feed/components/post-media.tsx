'use client'

import { Play } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'
import { Models } from '@/models'

const PLAY_EVENT = 'blogram:play'

export const PostMedia = ({ post }: { post: Models.Post }) => {
  const t = useT()
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handlePlayback = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== post.id) {
        videoRef.current?.pause()
        setIsPlaying(false)
      }
    }
    window.addEventListener(PLAY_EVENT, handlePlayback)
    return () => window.removeEventListener(PLAY_EVENT, handlePlayback)
  }, [post.id])

  const handlePlay = () => {
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: post.id }))
  }

  if (post.type === 'video' && post.video) {
    return (
      <video
        ref={videoRef}
        controls
        playsInline
        preload="none"
        poster={post.image ? `${Models.MEDIA_PATH}/${post.image.id}` : undefined}
        width={post.video.width}
        height={post.video.height}
        className="max-h-screen w-full bg-muted object-contain"
        aria-label={post.text || t('feed.video')}
        onPlay={handlePlay}
      >
        <source src={`${Models.MEDIA_PATH}/${post.video.id}`} type={post.video.contentType} />
      </video>
    )
  }

  if (post.type === 'youtube' && post.youtube) {
    return isPlaying ? (
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube-nocookie.com/embed/${post.youtube.videoId}?autoplay=1&rel=0`}
        title={post.text || t('feed.youtube')}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    ) : (
      <div className="relative bg-muted">
        <Image
          src={post.youtube.thumbnailUrl}
          width={480}
          height={360}
          alt=""
          unoptimized
          className="aspect-video w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            aria-label={t('feed.play')}
            className="min-h-14 min-w-14 rounded-full shadow-md"
            onClick={() => {
              handlePlay()
              setIsPlaying(true)
            }}
          >
            <Play className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <p className="px-5 py-2 text-xs text-muted-foreground">{t('feed.youtubeConsent')}</p>
      </div>
    )
  }

  if (!post.image) {
    return null
  }
  const { image } = post
  const srcSet = image.variants
    .map((variant) => `${Models.MEDIA_PATH}/${image.id}?variant=${variant.name} ${variant.width}w`)
    .concat(`${Models.MEDIA_PATH}/${image.id} ${image.width}w`)
    .join(', ')
  return (
    <picture>
      <source srcSet={srcSet} sizes="(min-width: 768px) 42rem, 100vw" />
      <Image
        src={`${Models.MEDIA_PATH}/${image.id}`}
        width={image.width}
        height={image.height}
        alt={image.altText}
        unoptimized
        className="h-auto w-full bg-muted"
      />
    </picture>
  )
}
