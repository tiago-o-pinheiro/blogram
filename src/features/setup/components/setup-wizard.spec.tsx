import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type SetupState } from '@/models/models'

import { SetupWizard } from './setup-wizard'

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const STATE: Pick<SetupState, 'profile'> = {
  profile: { name: 'Ada', description: 'Writer', hasPhoto: false },
}

const renderWizard = (initialState: Pick<SetupState, 'profile'>) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <SetupWizard initialState={initialState} />
    </I18nProvider>,
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SetupWizard', () => {
  it('Given a saved draft, should resume at step 1 with the draft filled', () => {
    renderWizard(STATE)

    expect(screen.getByRole('listitem', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
  })

  it('Given step 1 is shown, should mark only the profile step as current', () => {
    renderWizard({ ...STATE, profile: null })

    expect(screen.getByRole('list', { name: 'Setup progress' })).toBeVisible()
    expect(
      screen.getAllByRole('listitem').filter((item) => item.ariaCurrent === 'step'),
    ).toHaveLength(1)
  })

  it('Given the first step, should show a single heading and the step count', () => {
    renderWizard(STATE)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Your public profile' })).toBeVisible()
    expect(screen.getByText('Step 1 of 3')).toBeVisible()
  })

  it('Given the first render, should not move focus to the heading', () => {
    renderWizard(STATE)

    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus()
  })

  it('Given a saved draft, should move to the owner step after Continue', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(STATE.profile))
    renderWizard(STATE)

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('listitem', { name: 'Owner account' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByText('Step 2 of 3')).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('Given the step changes, should move focus to the new heading', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(STATE.profile))
    renderWizard(STATE)

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await vi.waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'Create your owner account' }),
      ).toHaveFocus(),
    )
  })

  it('Given a valid owner account, should show the review step as current with the step count', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(STATE.profile))
    renderWizard(STATE)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(await screen.findByLabelText('Email or username'), 'owner@example.test')
    await user.type(screen.getByLabelText('Password'), 'owner-password')
    await user.type(screen.getByLabelText('Confirm password'), 'owner-password')

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('listitem', { name: 'Review' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByText('Step 3 of 3')).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
