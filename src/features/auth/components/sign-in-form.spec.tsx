import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SignInForm } from './sign-in-form'

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const fillAndSubmit = async () => {
  const user = userEvent.setup()
  render(<SignInForm />)
  await user.type(screen.getByLabelText('Email'), 'member@example.test')
  await user.type(screen.getByLabelText('Password'), '::password::-12345')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInForm', () => {
  it('Given valid credentials, should navigate home and refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ token: '::token::', user: { id: '::id::' } }),
    )

    await fillAndSubmit()

    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/'))
    expect(router.refresh).toHaveBeenCalled()
  })

  it('Given wrong credentials, should show a human message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: '::invalid::' }, { status: 401 }),
    )

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
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

  it('Given the form, should link to the sign up page', () => {
    render(<SignInForm />)

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/sign-up')
  })
})
