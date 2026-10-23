import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { PostForm } from '@/features/posts/components/post-form'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'

export const dynamic = 'force-dynamic'

const Page = async () => {
  await requireOwnerPage()
  const t = await getServerTranslator()

  return (
    <PageShell title={t('postForm.newTitle')}>
      <PostForm />
    </PageShell>
  )
}

export default Page
