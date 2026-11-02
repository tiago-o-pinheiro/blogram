import { Check, ChevronDown } from 'lucide-react'
import { headers } from 'next/headers'
import { type ReactNode } from 'react'

import { cn } from '@/design-system/ui/lib/cn'
import { getServerTranslator } from '@/i18n/server'

import { authService } from '@/server/modules/auth/services/auth.service'
import { googleSettingsService } from '@/server/modules/auth/services/google-settings.service'

import { GoogleAccountControls } from './google-account-controls'
import { GoogleSetupGuide } from './google-setup-guide'
import { GoogleSignInSettingsForm } from './google-sign-in-settings-form'

type StepHeadingProps = { number: number; title: string; isDone: boolean; doneLabel: string }

const StepHeading = ({ number, title, isDone, doneLabel }: StepHeadingProps) => (
  <span className="flex items-center gap-3 font-medium">
    <span
      key={isDone ? 'done' : 'todo'}
      className={cn(
        'flex size-8 shrink-0 animate-scale-in items-center justify-center rounded-full text-sm transition',
        isDone ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
      )}
    >
      {isDone ? <Check aria-hidden="true" className="size-4" /> : number}
    </span>
    <span>{title}</span>
    {isDone ? <span className="sr-only">({doneLabel})</span> : null}
  </span>
)

const StepCard = ({ children }: { children: ReactNode }) => (
  <li className="flex flex-col gap-4 rounded-lg border border-line p-4 transition">{children}</li>
)

export const GoogleAccount = async () => {
  const [settings, account, t] = await Promise.all([
    googleSettingsService.getSettings(),
    authService.getGoogleAccount(await headers()),
    getServerTranslator(),
  ])
  if (!account) {
    return null
  }
  const doneLabel = t('google.steps.done')
  const isLinked = account.accountId !== null

  return (
    <section
      aria-labelledby="google-title"
      className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5"
    >
      <h2 id="google-title" className="text-lg font-semibold">
        {t('google.title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('google.description')}</p>
      <ol className="flex flex-col gap-3 stagger *:animate-rise-in">
        <StepCard>
          <details open={!account.isConfigured} className="group flex flex-col gap-4">
            <summary className="flex min-h-11 press cursor-pointer list-none items-center justify-between gap-2 rounded-md transition focus-visible:outline-2 focus-visible:outline-ring">
              <StepHeading
                number={1}
                title={t('google.steps.create')}
                isDone={account.isConfigured}
                doneLabel={doneLabel}
              />
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180"
              />
            </summary>
            <div className="animate-rise-in pt-4">
              <GoogleSetupGuide
                origin={new URL(settings.redirectUri).origin}
                redirectUri={settings.redirectUri}
              />
            </div>
          </details>
        </StepCard>
        <StepCard>
          <StepHeading
            number={2}
            title={t('google.steps.credentials')}
            isDone={account.isConfigured}
            doneLabel={doneLabel}
          />
          <GoogleSignInSettingsForm settings={settings} />
        </StepCard>
        <StepCard>
          <StepHeading
            number={3}
            title={t('google.steps.link')}
            isDone={isLinked}
            doneLabel={doneLabel}
          />
          <GoogleAccountControls {...account} />
        </StepCard>
      </ol>
    </section>
  )
}
