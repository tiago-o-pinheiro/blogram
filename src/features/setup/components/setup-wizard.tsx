'use client'

import { useT } from '@/i18n/i18n-context'
import { type SetupState } from '@/models/models'

import { OwnerStep } from './owner-step'
import { ProfileStep } from './profile-step'
import { ReviewStep } from './review-step'
import { SetupWizardProvider, type SetupStep, useSetupWizardState } from './setup-wizard-context'

type SetupWizardProps = {
  initialState: Pick<SetupState, 'profile'>
}

const STEPS = [
  { step: 1, labelKey: 'wizard.steps.profile' },
  { step: 2, labelKey: 'wizard.steps.owner' },
  { step: 3, labelKey: 'wizard.steps.review' },
] as const satisfies ReadonlyArray<{ step: SetupStep; labelKey: string }>

const WizardBody = () => {
  const t = useT()
  const { step } = useSetupWizardState()

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex gap-4">
        {STEPS.map((item) => (
          <li
            key={item.step}
            aria-current={item.step === step ? 'step' : undefined}
            className={item.step === step ? 'font-semibold' : 'text-muted-foreground'}
          >
            {t(item.labelKey)}
          </li>
        ))}
      </ol>
      {step === 1 ? <ProfileStep /> : null}
      {step === 2 ? <OwnerStep /> : null}
      {step === 3 ? <ReviewStep /> : null}
    </div>
  )
}

export const SetupWizard = ({ initialState }: SetupWizardProps) => (
  <SetupWizardProvider initialProfile={initialState.profile}>
    <WizardBody />
  </SetupWizardProvider>
)
