import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { UnlockForm } from './unlock-form'

const router = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const PASSWORD = '::setup-password-secret::'

const submit = async () => {
  const user = userEvent.setup()
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <UnlockForm />
    </I18nProvider>,
  )
  await user.type(screen.getByLabelText('Setup password'), PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Unlock' }))
}

describe('UnlockForm', () => {
  it('Given the correct password, should send it and go to the wizard', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    await submit()

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/setup'))
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/setup/unlock',
      expect.objectContaining({ body: JSON.stringify({ password: PASSWORD }) }),
    )
  })

  it('Given the password field, should be a password input with autocomplete off', () => {
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <UnlockForm />
      </I18nProvider>,
    )

    const input = screen.getByLabelText('Setup password')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'off')
  })

  it('Given a wrong password, should show an alert without echoing it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))

    await submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That setup password is not correct.')
    expect(alert).not.toHaveTextContent(PASSWORD)
  })

  it('Given a throttled response, should show the too many attempts message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 429 }))

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })

  it('Given an unconfigured server, should show the unavailable message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Setup is not available.')
  })

  it('Given a network failure, should show the generic setup message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Setup failed.')
  })

  it('Given a pending request, should disable the submit button', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    await submit()

    expect(await screen.findByRole('button', { name: /Unlock/ })).toBeDisabled()
  })
})
