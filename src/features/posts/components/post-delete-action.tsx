'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'
import type * as Models from '@/models/models'

import { DeletePostDialog } from './delete-post-dialog'

type PostDeleteActionProps = {
  post: Models.Post
}

export const PostDeleteAction = ({ post }: PostDeleteActionProps) => {
  const t = useT()
  const router = useRouter()

  return (
    <DeletePostDialog
      post={post}
      trigger={
        <Button variant="ghost" size="sm" className="w-fit text-danger hover:bg-danger/10">
          <Trash2 aria-hidden="true" className="size-4" />
          {t('postList.deleteConfirm')}
        </Button>
      }
      onDeleted={() => router.replace('/admin/posts')}
    />
  )
}
