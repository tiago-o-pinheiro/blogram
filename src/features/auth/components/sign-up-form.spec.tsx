import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SignUpForm } from './sign-up-form'

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => router }))

const fillAndSubmit = async () => {
  const user = userEvent.setup()
  render(<SignUpForm />)
  await user.type(screen.getByLabelText('Name'), '::member::')
  await user.type(screen.getByLabelText('Email'), 'member@example.test')
  await user.type(screen.getByLabelText('Password'), '::password::-12345')
  await user.click(screen.getByRole('button', { name: 'Sign up' }))
}

describe('SignUpForm', () => {
  it('Given valid details, should navigate home and refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ token: '::token::', user: { id: '::id::' } }),
    )

    await fillAndSubmit()

    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/'))
    expect(router.refresh).toHaveBeenCalled()
  })

  it('Given an email already in use, should show a human message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: '::exists::' }, { status: 422 }),
    )

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists.',
    )
  })

  it('Given a rejected request, should show the generic message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('::offline::'))

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not create your account. Try again.',
    )
  })

  it('Given a pending request, should disable the submit button', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    await fillAndSubmit()

    expect(await screen.findByRole('button', { name: /Sign up/ })).toBeDisabled()
  })

  it('Given the form, should link to the sign in page', () => {
    render(<SignUpForm />)

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })
})
