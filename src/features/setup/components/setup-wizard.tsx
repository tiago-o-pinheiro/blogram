'use client'

import { BookOpen, Check, LockKeyhole } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Card } from '@/design-system/ui/card'
import { cn } from '@/design-system/ui/lib/cn'
import { useT } from '@/i18n/i18n-context'
import { type SetupState } from '@/models/models'

import { OwnerStep } from './owner-step'
import { ProfileStep } from './profile-step'
import { ReviewStep } from './review-step'
import { SetupWizardProvider, type SetupStep, useSetupWizardState } from './setup-wizard-context'

type SetupWizardProps = {
  initialState: Pick<SetupState, 'profile'>
  maxPhotoBytes?: number
}

type StepProps = { step: SetupStep }

const STEPS = [
  { step: 1, labelKey: 'wizard.steps.profile' },
  { step: 2, labelKey: 'wizard.steps.owner' },
  { step: 3, labelKey: 'wizard.steps.review' },
] as const satisfies ReadonlyArray<{ step: SetupStep; labelKey: string }>

const STEP_CONTENT = {
  1: { title: 'wizard.profile.title', description: 'wizard.profile.intro' },
  2: { title: 'wizard.owner.title', description: 'wizard.owner.intro' },
  3: { title: 'finalize.review.title', description: 'wizard.review.intro' },
} as const

const WizardHeader = ({ step }: StepProps) => {
  const t = useT()

  return (
    <header className="mb-8 flex items-center justify-between gap-4 px-2 sm:mb-10">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
          <BookOpen className="size-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Blogram</span>
      </div>
      <p className="text-xs text-muted-foreground sm:text-sm">
        {t('wizard.stepCount', { step, total: STEPS.length })}
      </p>
    </header>
  )
}

const WizardStepper = ({ step }: StepProps) => {
  const t = useT()

  return (
    <ol
      aria-label={t('wizard.progress')}
      className="grid grid-cols-3 gap-3 border-b border-border/20 bg-surface/40 px-4 py-5 sm:px-10 sm:py-6"
    >
      {STEPS.map((item) => (
        <li
          key={item.step}
          aria-label={t(item.labelKey)}
          aria-current={item.step === step ? 'step' : undefined}
          className={cn(
            'flex min-w-0 flex-col items-center gap-2 text-center text-xs sm:flex-row sm:text-left sm:text-sm',
            item.step === step ? 'font-semibold' : 'text-muted-foreground',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs',
              item.step === step && 'border-primary bg-primary text-primary-foreground shadow-sm',
              item.step < step && 'border-accent bg-accent text-accent-foreground',
              item.step > step && 'border-border/30 bg-background text-muted-foreground',
            )}
          >
            {item.step < step ? <Check className="size-4" /> : `0${item.step}`}
          </span>
          <span>{t(item.labelKey)}</span>
        </li>
      ))}
    </ol>
  )
}

const WizardStepBody = ({ step, maxPhotoBytes }: StepProps & { maxPhotoBytes?: number }) => {
  const t = useT()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStepRef = useRef(step)

  useEffect(() => {
    if (previousStepRef.current === step) {
      return
    }
    previousStepRef.current = step
    headingRef.current?.focus()
  }, [step])

  return (
    <div className="p-5 sm:p-10">
      <header className="mb-7 max-w-xl space-y-3 sm:mb-9">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight focus:outline-none sm:text-4xl"
        >
          {t(STEP_CONTENT[step].title)}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t(STEP_CONTENT[step].description)}
        </p>
      </header>
      {step === 1 ? <ProfileStep maxPhotoBytes={maxPhotoBytes} /> : null}
      {step === 2 ? <OwnerStep /> : null}
      {step === 3 ? <ReviewStep /> : null}
    </div>
  )
}

const WizardBody = ({ maxPhotoBytes }: { maxPhotoBytes?: number }) => {
  const t = useT()
  const { step } = useSetupWizardState()

  return (
    <main className="relative min-h-dvh bg-surface px-4 py-6 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-linear-to-b from-accent/35 to-transparent"
      />
      <div className="relative mx-auto max-w-5xl">
        <WizardHeader step={step} />
        <Card className="gap-0 overflow-hidden rounded-2xl border-border/20 bg-background p-0 shadow-md">
          <WizardStepper step={step} />
          <WizardStepBody step={step} maxPhotoBytes={maxPhotoBytes} />
        </Card>
        <footer className="mt-6 flex items-center justify-center gap-2 px-3 text-center text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
          {t('wizard.footer')}
        </footer>
      </div>
    </main>
  )
}

export const SetupWizard = ({ initialState, maxPhotoBytes }: SetupWizardProps) => (
  <SetupWizardProvider initialProfile={initialState.profile}>
    <WizardBody maxPhotoBytes={maxPhotoBytes} />
  </SetupWizardProvider>
)
