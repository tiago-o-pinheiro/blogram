import { getServerTranslator } from '@/i18n/server'

import { PageShell } from '@/components/page-shell'
import {
  ACCOUNT_SECTIONS,
  AccountSectionNav,
  type AccountSection,
} from '@/features/admin/components/account-section-nav'
import { AiSettingsForm } from '@/features/ai/components/ai-settings-form'
import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { GoogleAccount } from '@/features/auth/components/google-account'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { DeleteAllPosts } from '@/features/posts/components/delete-all-posts'
import { aiSettingsService } from '@/server/modules/ai/services/ai-settings.service'
import { requireOwnerPage } from '@/server/modules/auth/guards/admin-page.guard'
import { postService } from '@/server/modules/posts/services/post.service'

export const dynamic = 'force-dynamic'

type AccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const DEFAULT_SECTION: AccountSection = 'security'

const toSection = (value: string | string[] | undefined): AccountSection =>
  ACCOUNT_SECTIONS.find((section) => section === value) ?? DEFAULT_SECTION

const Page = async ({ searchParams }: AccountPageProps) => {
  await requireOwnerPage()
  const t = await getServerTranslator()
  const { section: rawSection } = await searchParams
  const section = toSection(rawSection)

  return (
    <PageShell title={t('adminShell.account')}>
      <AccountSectionNav activeSection={section} />
      <div key={section} className="flex animate-rise-in flex-col gap-4">
        {section === 'security' && (
          <>
            <section
              className="flex flex-col gap-5 rounded-xl border border-line bg-card p-5"
              aria-labelledby="password-title"
            >
              <h2 id="password-title" className="text-lg font-semibold">
                {t('account.title')}
              </h2>
              <ChangePasswordForm />
            </section>
            <GoogleAccount />
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
              <h2 className="text-lg font-semibold">{t('account.session')}</h2>
              <p className="text-sm text-muted-foreground">{t('account.sessionHint')}</p>
              <SignOutButton />
            </section>
          </>
        )}
        {section === 'ai' && <AiSettingsForm settings={await aiSettingsService.getSettings()} />}
        {section === 'data' && <DeleteAllPosts count={await postService.countPosts()} />}
      </div>
    </PageShell>
  )
}

export default Page
