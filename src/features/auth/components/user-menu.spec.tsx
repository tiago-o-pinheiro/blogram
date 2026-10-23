import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

import { UserMenu } from './user-menu'

const renderMenu = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <UserMenu />
    </I18nProvider>,
  )

const renderMenuWithSession = (session: unknown) => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(session)))
  authClient.$store.notify('$sessionSignal')
  renderMenu()
  return fetchSpy
}

describe('UserMenu', () => {
  it('Given a pending session, should show a loading placeholder', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderMenu()

    expect(screen.getByRole('status', { name: 'Loading...' })).toBeVisible()
  })

  it('Given no session, should render no sign in or sign up links', async () => {
    renderMenuWithSession(null)

    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('Given a session, should greet the owner and sign out on request', async () => {
    const user = userEvent.setup()
    const fetchSpy = renderMenuWithSession({
      session: { id: '::session::', userId: '::id::' },
      user: { id: '::id::', name: '::owner::', email: 'owner@example.test' },
    })

    expect(await screen.findByText('Signed in as ::owner::')).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await vi.waitFor(() =>
      expect(fetchSpy.mock.calls.map(([input]) => String(input))).toContainEqual(
        expect.stringContaining('/sign-out'),
      ),
    )
  })
})
