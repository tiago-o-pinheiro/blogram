import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { authClient } from '@/lib/auth-client'

import { UserMenu } from './user-menu'

const renderMenu = (session: unknown) => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(session)))
  authClient.$store.notify('$sessionSignal')
  render(<UserMenu />)
  return fetchSpy
}

describe('UserMenu', () => {
  it('Given a pending session, should show a loading placeholder', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    render(<UserMenu />)

    expect(screen.getByRole('status', { name: 'Checking your session' })).toBeVisible()
  })

  it('Given no session, should offer sign in and sign up links', async () => {
    renderMenu(null)

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/sign-up')
  })

  it('Given a session, should greet the user and sign out on request', async () => {
    const user = userEvent.setup()
    const fetchSpy = renderMenu({
      session: { id: '::session::', userId: '::id::' },
      user: { id: '::id::', name: '::member::', email: 'member@example.test' },
    })

    expect(await screen.findByText('Signed in as ::member::')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await vi.waitFor(() =>
      expect(fetchSpy.mock.calls.map(([input]) => String(input))).toContainEqual(
        expect.stringContaining('/sign-out'),
      ),
    )
  })
})
