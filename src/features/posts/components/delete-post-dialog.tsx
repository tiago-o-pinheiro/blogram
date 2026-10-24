'use client'

import { type ReactNode, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/design-system/ui/dialog'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { deletePost, PostsApiError } from '../api/posts-api'
import { toPostsMessageKey } from '../lib/to-posts-message'

type DeletePostDialogProps = {
  post: Models.Post
  trigger?: ReactNode
  onDeleted: () => void
}

export const DeletePostDialog = ({ post, trigger, onDeleted }: DeletePostDialogProps) => {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (isPending) {
      return
    }
    setIsOpen(nextIsOpen)
    setErrorKey(null)
  }

  const handleDelete = async () => {
    setErrorKey(null)
    setIsPending(true)
    try {
      await deletePost(post.id)
    } catch (error) {
      setIsPending(false)
      setErrorKey(
        error instanceof PostsApiError ? toPostsMessageKey(error.status) : 'posts.error.generic',
      )
      return
    }
    setIsPending(false)
    setIsOpen(false)
    onDeleted()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            {t('postList.delete')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('postList.deleteTitle')}</DialogTitle>
          <DialogDescription>{t('postList.deleteDescription')}</DialogDescription>
        </DialogHeader>
        {errorKey ? (
          <p role="alert" className="animate-rise-in text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isPending}>
              {t('postList.deleteCancel')}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            isLoading={isPending}
            loadingLabel={t('postList.deleting')}
            onClick={() => void handleDelete()}
          >
            {t('postList.deleteConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
