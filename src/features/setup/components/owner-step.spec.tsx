import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { OwnerStep } from './owner-step'
import { SetupWizardProvider, useSetupWizardState } from './setup-wizard-context'

const PASSWORD = '::password::-12345'

const Probe = () => {
  const { step, owner } = useSetupWizardState()
  return (
    <p data-testid="probe">
      {step}|{owner.identifier}
    </p>
  )
}

const renderStep = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <SetupWizardProvider initialProfile={null}>
        <OwnerStep />
        <Probe />
      </SetupWizardProvider>
    </I18nProvider>,
  )

const fill = async (identifier: string, password: string, confirmation: string) => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email or username'), identifier)
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('OwnerStep', () => {
  it('Given valid owner input, should store it and go to the review step', async () => {
    renderStep()

    await fill('Owner@Example.test', PASSWORD, PASSWORD)

    expect(screen.getByTestId('probe')).toHaveTextContent('3|Owner@Example.test')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Given an invalid identifier, should show an alert and stay on the step', async () => {
    renderStep()

    await fill('a@', PASSWORD, PASSWORD)

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email or a username')
    expect(screen.getByTestId('probe')).toHaveTextContent('1|')
  })

  it('Given a one-character password, should store the owner and go to the review step', async () => {
    renderStep()

    await fill('owner', 'a', 'a')

    expect(screen.getByTestId('probe')).toHaveTextContent('3|owner')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Given an empty password, should block the step', async () => {
    const user = userEvent.setup()
    renderStep()

    await user.type(screen.getByLabelText('Email or username'), 'owner')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText('Password')).toBeInvalid()
    expect(screen.getByTestId('probe')).toHaveTextContent('1|')
  })

  it('Given a password longer than the limit, should cap the typing at 128 characters', async () => {
    const user = userEvent.setup()
    renderStep()

    await user.type(screen.getByLabelText('Password'), 'a'.repeat(129))

    expect(screen.getByLabelText('Password')).toHaveValue('a'.repeat(128))
  })

  it('Given a mismatching confirmation, should show the mismatch alert', async () => {
    renderStep()

    await fill('owner', PASSWORD, `${PASSWORD}x`)

    expect(screen.getByRole('alert')).toHaveTextContent('The passwords do not match.')
  })

  it('Given the password toggles, should reveal each field independently and keep the values', async () => {
    const user = userEvent.setup()
    renderStep()
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.tab()
    await user.keyboard('{Enter}')

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Confirm password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveValue(PASSWORD)
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Confirm password')).toHaveValue(PASSWORD)
  })

  it('Given the back button, should return to the profile step', async () => {
    const user = userEvent.setup()
    renderStep()
    await fill('owner', PASSWORD, PASSWORD)

    expect(screen.getByTestId('probe')).toHaveTextContent('3|owner')
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByTestId('probe')).toHaveTextContent('1|owner')
  })
})
