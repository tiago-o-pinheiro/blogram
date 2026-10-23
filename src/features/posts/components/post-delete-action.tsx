'use client'

import { useRouter } from 'next/navigation'

import type * as Models from '@/models/models'

import { DeletePostDialog } from './delete-post-dialog'

type PostDeleteActionProps = {
  post: Models.Post
}

export const PostDeleteAction = ({ post }: PostDeleteActionProps) => {
  const router = useRouter()

  return <DeletePostDialog post={post} onDeleted={() => router.replace('/admin/posts')} />
}
