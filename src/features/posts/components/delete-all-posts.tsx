'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

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
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'

import { deleteAllPosts } from '../api/posts-api'

type DeleteAllPostsProps = {
  count: number
}

export const DeleteAllPosts = ({ count }: DeleteAllPostsProps) => {
  const t = useT()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [typedWord, setTypedWord] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [deletedCount, setDeletedCount] = useState<number | null>(null)
  const confirmWord = t('account.deleteAll.confirmWord')

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (isPending) {
      return
    }
    setIsOpen(nextIsOpen)
    setTypedWord('')
    setErrorKey(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (typedWord !== confirmWord) {
      return
    }
    setErrorKey(null)
    setIsPending(true)
    try {
      const result = await deleteAllPosts()
      setDeletedCount(result.deleted)
    } catch {
      setIsPending(false)
      setErrorKey('account.deleteAll.error')
      return
    }
    setIsPending(false)
    setIsOpen(false)
    setTypedWord('')
    router.refresh()
  }

  return (
    <div className="flex animate-rise-in flex-col gap-4 rounded-xl border border-danger p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{t('account.data.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('account.data.hint')}</p>
        <p className="text-sm font-medium">{t('account.data.count', { count })}</p>
      </div>
      {deletedCount !== null ? (
        <p key={deletedCount} role="status" className="animate-rise-in text-sm">
          {t('account.deleteAll.done', { count: deletedCount })}
        </p>
      ) : null}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={count === 0} className="self-start">
            {t('account.deleteAll.open')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t('account.deleteAll.title')}</DialogTitle>
              <DialogDescription>{t('account.deleteAll.description')}</DialogDescription>
            </DialogHeader>
            <Field
              label={`${t('account.deleteAll.confirmLabel')}: ${confirmWord}`}
              value={typedWord}
              autoComplete="off"
              onChange={(event) => setTypedWord(event.target.value)}
            />
            {errorKey ? (
              <p role="alert" className="animate-rise-in text-sm text-danger">
                {t(errorKey)}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isPending}>
                  {t('postList.deleteCancel')}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={typedWord !== confirmWord}
                isLoading={isPending}
                loadingLabel={t('account.deleteAll.submitting')}
              >
                {t('account.deleteAll.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
