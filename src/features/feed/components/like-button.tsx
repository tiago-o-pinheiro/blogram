'use client'

import { Heart } from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'
import { Value } from 'typebox/value'

import { Button } from '@/design-system/ui/button'
import { cn } from '@/design-system/ui/lib/cn'
import { useT } from '@/i18n/i18n-context'
import { Models } from '@/models'

import { readLiked, rememberLike, subscribeLikes } from '@/features/feed/lib/liked-store'

export const LikeButton = ({ id, likes }: { id: string; likes: number }) => {
  const t = useT()
  const isLiked = useSyncExternalStore(
    subscribeLikes,
    () => readLiked(id),
    () => false,
  )
  const [confirmation, setConfirmation] = useState({ id, likes })
  const count = Math.max(likes, confirmation.id === id ? confirmation.likes : 0)
  const [isSaving, setIsSaving] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [hasJustLiked, setHasJustLiked] = useState(false)
  const isSubmitting = useRef(false)

  if (confirmation.id !== id || likes > confirmation.likes) {
    setConfirmation({ id, likes })
  }

  const handleLike = async () => {
    if (isSubmitting.current || readLiked(id)) {
      return
    }
    isSubmitting.current = true
    setIsSaving(true)
    setHasError(false)
    try {
      const response = await fetch(`/api/posts/${id}/like`, { method: 'POST' })
      const body: unknown = await response.json()
      if (!response.ok || !Value.Check(Models.PostLikes, body)) {
        setHasError(true)
        return
      }
      setConfirmation((currentConfirmation) => ({
        id,
        likes: Math.max(body.likes, currentConfirmation.id === id ? currentConfirmation.likes : 0),
      }))
      rememberLike(id)
      setHasJustLiked(true)
    } catch {
      setHasError(true)
    } finally {
      isSubmitting.current = false
      setIsSaving(false)
    }
  }

  return (
    <div>
      <Button
        variant="ghost"
        className={cn('min-h-11 gap-2 rounded-full px-3', isLiked && 'text-primary')}
        aria-label={t(isLiked ? 'feed.liked' : 'feed.like')}
        aria-pressed={isLiked}
        aria-busy={isSaving}
        disabled={isSaving || isLiked}
        onClick={() => void handleLike()}
      >
        <Heart
          aria-hidden="true"
          className={cn('size-4', isLiked && 'fill-current', hasJustLiked && 'animate-pop')}
        />
        <span aria-live="polite">{count}</span>
      </Button>
      {hasError ? (
        <p role="alert" className="text-sm text-danger">
          {t('feed.likeError')}
        </p>
      ) : null}
    </div>
  )
}
