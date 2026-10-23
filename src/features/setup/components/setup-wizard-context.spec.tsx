import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  SetupWizardProvider,
  useSetupWizardActions,
  useSetupWizardState,
} from './setup-wizard-context'

const PROFILE = { name: 'Ada', description: 'Writer', hasPhoto: false }

const wrapper = ({ children }: { children: ReactNode }) => (
  <SetupWizardProvider initialProfile={PROFILE}>{children}</SetupWizardProvider>
)

const Probe = () => {
  const { step } = useSetupWizardState()
  const { goTo } = useSetupWizardActions()
  return (
    <button type="button" onClick={() => goTo(2)}>
      step {step}
    </button>
  )
}

describe('setup wizard context', () => {
  it('Given no provider, should throw from the state hook', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useSetupWizardState())).toThrow(
      'useSetupWizardState must be used within a SetupWizardProvider',
    )
  })

  it('Given no provider, should throw from the actions hook', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useSetupWizardActions())).toThrow(
      'useSetupWizardActions must be used within a SetupWizardProvider',
    )
  })

  it('Given an initial profile, should start at step 1 with that draft and an empty owner', () => {
    const { result } = renderHook(() => useSetupWizardState(), { wrapper })

    expect(result.current.step).toBe(1)
    expect(result.current.profile).toEqual(PROFILE)
    expect(result.current.photoPreviewUrl).toBeNull()
    expect(result.current.owner.identifier).toBe('')
  })

  it('Given goTo is called, should move to that step', async () => {
    render(<Probe />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'step 1' }))

    expect(screen.getByRole('button', { name: 'step 2' })).toBeVisible()
  })
})
