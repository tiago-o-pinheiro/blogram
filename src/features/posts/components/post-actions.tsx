'use client'

import { EyeOff, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { PostsApiError, setPostStatus } from '../api/posts-api'
import { toPostsMessageKey } from '../lib/to-posts-message'

type PostActionsProps = {
  post: Models.Post
}

export const PostActions = ({ post }: PostActionsProps) => {
  const t = useT()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const isDraft = post.status === 'draft'

  const handleToggle = async () => {
    setErrorKey(null)
    setIsPending(true)
    try {
      await setPostStatus(post.id, isDraft ? 'published' : 'draft')
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
    <div className="flex items-center gap-2">
      {errorKey ? (
        <p role="alert" className="animate-rise-in text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      <Button
        variant={isDraft ? 'primary' : 'secondary'}
        size="icon"
        className="rounded-full"
        aria-label={isDraft ? t('postPreview.publish') : t('postPreview.unpublish')}
        title={isDraft ? t('postPreview.publish') : t('postPreview.unpublish')}
        isLoading={isPending}
        loadingLabel={t('postPreview.working')}
        onClick={() => void handleToggle()}
      >
        {isDraft ? (
          <Send aria-hidden="true" className="size-5 animate-scale-in" />
        ) : (
          <EyeOff aria-hidden="true" className="size-5 animate-scale-in" />
        )}
      </Button>
    </div>
  )
}
