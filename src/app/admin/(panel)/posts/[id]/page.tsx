import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/design-system/ui/button'
import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { PostDeleteAction } from '@/features/posts/components/post-delete-action'
import { PostForm } from '@/features/posts/components/post-form'
import { NotFoundError } from '@/server/errors/http-errors'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'
import { postService } from '@/server/modules/posts/services/post.service'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

const Page = async ({ params }: PageProps) => {
  await requireOwnerPage()
  const { id } = await params
  const t = await getServerTranslator()
  const post = await postService.getPost(id).catch((error: unknown) => {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  })

  return (
    <PageShell title={t('postForm.editTitle')}>
      <Link
        href={`/admin/posts/${post.id}/preview`}
        className={buttonVariants({ variant: 'secondary', className: 'w-fit' })}
      >
        {t('postList.preview')}
      </Link>
      <PostForm post={post} />
      <PostDeleteAction post={post} />
    </PageShell>
  )
}

export default Page
