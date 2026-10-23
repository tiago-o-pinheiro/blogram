import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PasswordInput } from './password-input'

const PASSWORD = '::password::'

describe('PasswordInput', () => {
  it('Given a typed password, should hide it by default', async () => {
    const user = userEvent.setup()
    render(
      <PasswordInput aria-label="Password" showLabel="Show password" hideLabel="Hide password" />,
    )

    await user.type(screen.getByLabelText('Password'), PASSWORD)

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('type', 'button')
  })

  it('Given a click on the toggle, should reveal the typed value and offer to hide it', async () => {
    const user = userEvent.setup()
    render(
      <PasswordInput aria-label="Password" showLabel="Show password" hideLabel="Hide password" />,
    )
    await user.type(screen.getByLabelText('Password'), PASSWORD)

    await user.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Password')).toHaveValue(PASSWORD)
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('Given a second click on the toggle, should hide the value again without losing it', async () => {
    const user = userEvent.setup()
    render(
      <PasswordInput aria-label="Password" showLabel="Show password" hideLabel="Hide password" />,
    )
    await user.type(screen.getByLabelText('Password'), PASSWORD)

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    await user.click(screen.getByRole('button', { name: 'Hide password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Password')).toHaveValue(PASSWORD)
  })

  it('Given a press on the toggle, should keep the focus in the input', async () => {
    const user = userEvent.setup()
    render(
      <PasswordInput aria-label="Password" showLabel="Show password" hideLabel="Hide password" />,
    )
    await user.click(screen.getByLabelText('Password'))

    await user.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveFocus()
  })

  it('Given a disabled input, should disable the toggle as well', () => {
    render(
      <PasswordInput
        aria-label="Password"
        showLabel="Show password"
        hideLabel="Hide password"
        disabled
      />,
    )

    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
  })

  it('Given an id, should point the toggle at the input it reveals', () => {
    render(
      <PasswordInput
        id="::id::"
        aria-label="Password"
        showLabel="Show password"
        hideLabel="Hide password"
      />,
    )

    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-controls',
      '::id::',
    )
  })
})
