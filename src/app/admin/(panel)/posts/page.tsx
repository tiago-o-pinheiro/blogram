import { getServerTranslator } from '@/i18n/server'
import * as Models from '@/models/models'

import { PageShell } from '@/components/page-shell'
import { PostList } from '@/features/posts/components/post-list'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'
import { postService } from '@/server/modules/posts/services/post.service'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const readFirst = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const toQuery = (params: Record<string, string | string[] | undefined>): Models.PostListQuery => {
  const query = {
    page: Number(readFirst(params.page) ?? 1),
    pageSize: Models.PAGE_SIZE_DEFAULT,
    ...(readFirst(params.status) ? { status: readFirst(params.status) } : {}),
  }
  return Models.isPostListQuery(query) ? query : { page: 1, pageSize: Models.PAGE_SIZE_DEFAULT }
}

const Page = async ({ searchParams }: PageProps) => {
  await requireOwnerPage()
  const [t, params] = await Promise.all([getServerTranslator(), searchParams])
  const query = toQuery(params)
  const page = await postService.listPosts(query)

  return (
    <PageShell title={t('postList.title')}>
      <PostList page={page} status={query.status} />
    </PageShell>
  )
}

export default Page
