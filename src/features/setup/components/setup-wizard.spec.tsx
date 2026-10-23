import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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

describe('SetupWizard', () => {
  it('Given a saved draft, should resume at step 1 with the draft filled', () => {
    renderWizard(STATE)

    expect(screen.getByText('Profile', { selector: 'li' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
  })

  it('Given step 1 is shown, should mark only the profile step as current', () => {
    renderWizard({ ...STATE, profile: null })

    expect(
      screen.getAllByRole('listitem').filter((item) => item.ariaCurrent === 'step'),
    ).toHaveLength(1)
  })

  it('Given a saved draft, should move to the owner step after Continue', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(STATE.profile)),
    )
    renderWizard(STATE)

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Owner account', { selector: 'li' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    vi.unstubAllGlobals()
  })
})
