import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import { PostForm } from '@/features/posts/components/post-form'
import { env } from '@/server/config/env'
import { aiSettingsService } from '@/server/modules/ai/services/ai-settings.service'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'

export const dynamic = 'force-dynamic'

const Page = async () => {
  await requireOwnerPage()
  const t = await getServerTranslator()
  const { isEnabled } = await aiSettingsService.getSettings()

  return (
    <PageShell isWide title={t('postForm.newTitle')}>
      <PostForm
        isAiEnabled={isEnabled}
        maxImageBytes={env.UPLOAD_MAX_IMAGE_BYTES}
        maxVideoBytes={env.UPLOAD_MAX_VIDEO_BYTES}
        videoUploadMode={env.STORAGE_DRIVER === 's3' ? 'direct' : 'form'}
      />
    </PageShell>
  )
}

export default Page
