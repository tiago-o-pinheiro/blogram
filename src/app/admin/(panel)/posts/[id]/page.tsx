import { Eye } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@/design-system/ui/button'
import { cn } from '@/design-system/ui/lib/cn'
import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { PostDeleteAction } from '@/features/posts/components/post-delete-action'
import { PostForm } from '@/features/posts/components/post-form'
import { PostStatusBadge } from '@/features/posts/components/post-status-badge'
import { env } from '@/server/config/env'
import { NotFoundError } from '@/server/errors/http-errors'
import { aiSettingsService } from '@/server/modules/ai/services/ai-settings.service'
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

  const { isEnabled } = await aiSettingsService.getSettings()

  return (
    <PageShell
      isWide
      title={t('postForm.editTitle')}
      aside={
        <>
          <PostStatusBadge status={post.status} label={t(`posts.status.${post.status}`)} />
          <Link
            href={`/admin/posts/${post.id}/preview`}
            aria-label={t('postList.preview')}
            title={t('postList.preview')}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'icon' }),
              'ml-auto rounded-full',
            )}
          >
            <Eye aria-hidden="true" className="size-5" />
          </Link>
          <PostDeleteAction post={post} />
        </>
      }
    >
      <PostForm
        post={post}
        isAiEnabled={isEnabled}
        maxImageBytes={env.UPLOAD_MAX_IMAGE_BYTES}
        maxVideoBytes={env.UPLOAD_MAX_VIDEO_BYTES}
      />
    </PageShell>
  )
}

export default Page
