import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { SignInForm } from './sign-in-form'

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const fillAndSubmit = async (locale: 'en' | 'es' = 'en', identifier = 'owner@example.test') => {
  const user = userEvent.setup()
  const messages = getMessages(locale)
  render(
    <I18nProvider locale={locale} messages={messages}>
      <SignInForm />
    </I18nProvider>,
  )
  await user.type(screen.getByLabelText(messages['signin.identifier']), identifier)
  await user.type(screen.getByLabelText(messages['signin.password']), '::password::-12345')
  await user.click(screen.getByRole('button', { name: messages['signin.submit'] }))
}

const requestedUrls = (fetchSpy: { mock: { calls: Parameters<typeof fetch>[] } }) =>
  fetchSpy.mock.calls.map(([input]) => String(input))

describe('SignInForm', () => {
  it('Given an email identifier, should sign in by email and open the admin', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ token: '::token::', user: { id: '::id::' } }))

    await fillAndSubmit()

    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin'))
    expect(router.refresh).toHaveBeenCalled()
    expect(requestedUrls(fetchSpy)).toContainEqual(expect.stringContaining('/sign-in/email'))
  })

  it('Given a username identifier, should sign in by username', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ token: '::token::', user: { id: '::id::' } }))

    await fillAndSubmit('en', 'owner.name')

    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin'))
    expect(requestedUrls(fetchSpy)).toContainEqual(expect.stringContaining('/sign-in/username'))
  })

  it('Given wrong credentials, should show a human message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: '::invalid::' }, { status: 401 }),
    )

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email, username or password.')
  })

  it('Given the es locale, should show the spanish message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 401 }))

    await fillAndSubmit('es')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo, usuario o contraseña incorrectos.',
    )
  })

  it('Given a rejected request, should show the generic message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not sign you in. Try again.',
    )
  })

  it('Given a pending request, should disable the submit button', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    await fillAndSubmit()

    expect(await screen.findByRole('button', { name: /Sign in/ })).toBeDisabled()
  })

  it('Given a typed password, should reveal it with the toggle without losing it', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <SignInForm />
      </I18nProvider>,
    )
    await user.type(screen.getByLabelText('Password'), '::password::')

    await user.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Password')).toHaveValue('::password::')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('Given the password field, should cap the typed length', () => {
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <SignInForm />
      </I18nProvider>,
    )

    expect(screen.getByLabelText('Password')).toHaveAttribute('maxlength', '128')
  })

  it('Given the form, should not link to a sign up page', async () => {
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <SignInForm />
      </I18nProvider>,
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
