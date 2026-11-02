import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { ResetPasswordForm } from './reset-password-form'

const submitPassword = async (confirmation = '::new-password::') => {
  const user = userEvent.setup()
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <ResetPasswordForm token="::token::" />
    </I18nProvider>,
  )
  await user.type(screen.getByLabelText('New password'), '::new-password::')
  await user.type(screen.getByLabelText('Confirm new password'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Reset password' }))
}

describe('ResetPasswordForm', () => {
  it('Given matching passwords, should restore access and offer sign in', async () => {
    const reset = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: true }))
    window.history.replaceState(null, '', '/reset-password?token=::token::')

    await submitPassword()

    expect(await screen.findByRole('status')).toHaveTextContent(
      getMessages('en')['recovery.success'],
    )
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
    expect(window.location.search).toBe('')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(String(reset.mock.calls[0]?.[0])).toContain('/reset-password')
    expect(reset.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ token: '::token::', newPassword: '::new-password::' }),
    )
  })

  it('Given different passwords, should explain the mismatch without submitting', async () => {
    const reset = vi.spyOn(globalThis, 'fetch')

    await submitPassword('::different-password::')

    expect(await screen.findByRole('alert')).toHaveTextContent('The passwords do not match.')
    expect(reset).not.toHaveBeenCalled()
  })

  it('Given an expired link, should offer another recovery request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 400 }))

    await submitPassword()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      getMessages('en')['recovery.invalid'],
    )
    expect(screen.getByRole('link', { name: 'Request another recovery link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('Given pending recovery, should prevent duplicate password changes', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    await submitPassword()

    expect(screen.getByRole('button', { name: /Reset password/ })).toBeDisabled()
    expect(screen.getByLabelText('New password')).toBeDisabled()
  })

  it('Given an offline request, should allow retrying the password change', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))

    await submitPassword()

    expect(await screen.findByRole('alert')).toHaveTextContent(getMessages('en')['recovery.error'])
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeEnabled()
  })
})
