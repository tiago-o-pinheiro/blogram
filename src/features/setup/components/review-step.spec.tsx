import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type Profile } from '@/models/models'

import { ReviewStep } from './review-step'
import {
  SetupWizardProvider,
  useSetupWizardActions,
  useSetupWizardState,
} from './setup-wizard-context'

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const PROFILE: Profile = { name: '::name::', description: '::about::', hasPhoto: false }
const PASSWORD = '::password::-12345'

const SeedOwner = () => {
  const { setOwner } = useSetupWizardActions()
  useEffect(() => {
    setOwner({
      identifier: 'owner@example.test',
      password: PASSWORD,
      passwordConfirmation: PASSWORD,
    })
  }, [setOwner])
  return null
}

const StepProbe = () => {
  const { step } = useSetupWizardState()
  return <p data-testid="step">{step}</p>
}

const GoToReview = () => {
  const { goTo } = useSetupWizardActions()
  useEffect(() => {
    goTo(3)
  }, [goTo])
  return null
}

const renderStep = (profile: Profile | null) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <SetupWizardProvider initialProfile={profile}>
        <SeedOwner />
        <GoToReview />
        <StepProbe />
        <ReviewStep />
      </SetupWizardProvider>
    </I18nProvider>,
  )

describe('ReviewStep', () => {
  it('Given a draft, should say the password is set without showing it', async () => {
    renderStep(PROFILE)

    expect(await screen.findByText('Password set')).toBeVisible()
    expect(screen.queryByText(PASSWORD)).not.toBeInTheDocument()
  })

  it('Given Edit profile, should return to step 1', async () => {
    const user = userEvent.setup()
    renderStep(PROFILE)
    await screen.findByText('owner@example.test')

    await user.click(screen.getByRole('button', { name: 'Edit profile' }))

    expect(screen.getByTestId('step')).toHaveTextContent('1')
  })

  it('Given Edit account, should return to step 2', async () => {
    const user = userEvent.setup()
    renderStep(PROFILE)
    await screen.findByText('owner@example.test')

    await user.click(screen.getByRole('button', { name: 'Edit account' }))

    expect(screen.getByTestId('step')).toHaveTextContent('2')
  })

  it('Given a draft, should preview the profile and the identifier but never the password', async () => {
    renderStep(PROFILE)

    expect(await screen.findByText('owner@example.test')).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: '::name::' })).toBeVisible()
    expect(screen.getByText('::about::')).toBeVisible()
    expect(screen.queryByText(PASSWORD)).not.toBeInTheDocument()
  })

  it('Given a successful finish, should post the owner and navigate to the admin', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ redirectTo: '/admin' }))
    renderStep(PROFILE)
    await screen.findByText('owner@example.test')

    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin'))
    expect(router.refresh).toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/setup/finalize'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('owner@example.test'),
      }),
    )
  })

  it('Given a conflict response, should show the translated alert and re-enable the button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 403 }))
    renderStep(PROFILE)
    await screen.findByText('owner@example.test')

    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Setup is already complete.')
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeEnabled()
  })

  it('Given a pending request, should disable the finish button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderStep(PROFILE)
    await screen.findByText('owner@example.test')

    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(await screen.findByRole('button', { name: /Finish setup/ })).toBeDisabled()
  })

  it('Given no saved profile, should warn and disable the finish button', () => {
    renderStep(null)

    expect(screen.getByRole('alert')).toHaveTextContent('Complete the profile step')
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeDisabled()
  })
})
