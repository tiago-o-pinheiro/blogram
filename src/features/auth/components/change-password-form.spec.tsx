import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { ChangePasswordForm } from './change-password-form'

const CURRENT = '::current::-12345'
const NEXT = '::next-password::-12345'

const renderForm = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <ChangePasswordForm />
    </I18nProvider>,
  )

const fillAndSubmit = async (newPassword = NEXT, confirmation = NEXT) => {
  const user = userEvent.setup()
  renderForm()
  await user.type(screen.getByLabelText('Current password'), CURRENT)
  await user.type(screen.getByLabelText('New password'), newPassword)
  await user.type(screen.getByLabelText('Confirm new password'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ChangePasswordForm', () => {
  it('Given valid input, should revoke other sessions, confirm and clear the fields', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}))

    await fillAndSubmit()

    expect(await screen.findByRole('status')).toHaveTextContent('Your password was changed.')
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    const [input, init] = fetchSpy.mock.calls[0] ?? []
    expect(String(input)).toContain('/change-password')
    expect(String(init?.body)).toContain('"revokeOtherSessions":true')
  })

  it('Given a wrong current password, should show the wrong current alert', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: '::invalid::' }, { status: 400 }),
    )

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('The current password is wrong.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Given a mismatching confirmation, should not call the server', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await fillAndSubmit(NEXT, `${NEXT}x`)

    expect(screen.getByRole('alert')).toHaveTextContent('The passwords do not match.')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Given a one-character new password, should send the change request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}))

    await fillAndSubmit('a', 'a')

    expect(await screen.findByRole('status')).toHaveTextContent('Your password was changed.')
    const [, init] = fetchSpy.mock.calls[0] ?? []
    expect(String(init?.body)).toContain('"newPassword":"a"')
  })

  it('Given an empty new password, should block the request', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderForm()

    await user.type(screen.getByLabelText('Current password'), CURRENT)
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(screen.getByLabelText('New password')).toBeInvalid()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Given a new password longer than the limit, should cap the typing at 128 characters', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('New password'), 'a'.repeat(129))

    expect(screen.getByLabelText('New password')).toHaveValue('a'.repeat(128))
  })

  it('Given the three password toggles, should reveal every field', async () => {
    const user = userEvent.setup()
    renderForm()
    const toggles = screen.getAllByRole('button', { name: 'Show password' })

    expect(toggles).toHaveLength(3)
    for (const toggle of toggles) {
      await user.click(toggle)
    }

    expect(screen.getAllByRole('button', { name: 'Hide password' })).toHaveLength(3)
    expect(screen.getByLabelText('Current password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('type', 'text')
  })

  it('Given a rejected request, should show the generic alert', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not change your password. Try again.',
    )
  })

  it('Given a pending request, should disable the submit button', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    await fillAndSubmit()

    expect(await screen.findByRole('button', { name: /Change password/ })).toBeDisabled()
  })
})
