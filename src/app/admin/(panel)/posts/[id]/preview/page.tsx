import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/design-system/ui/button'
import { cn } from '@/design-system/ui/lib/cn'
import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { PostActions } from '@/features/posts/components/post-actions'
import { PostDeleteAction } from '@/features/posts/components/post-delete-action'
import { PostPreview } from '@/features/posts/components/post-preview'
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
    <PageShell
      title={t('postPreview.title')}
      aside={
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/admin/posts/${post.id}`}
            aria-label={t('postList.edit')}
            title={t('postList.edit')}
            className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }), 'rounded-full')}
          >
            <Pencil aria-hidden="true" className="size-5" />
          </Link>
          <PostActions post={post} />
          <PostDeleteAction post={post} />
        </div>
      }
    >
      <PostPreview post={post} />
    </PageShell>
  )
}

export default Page
