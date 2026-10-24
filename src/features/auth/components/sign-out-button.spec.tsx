import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { SignOutButton } from './sign-out-button'

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
const mount = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <SignOutButton />
    </I18nProvider>,
  )

describe('Account sign out', () => {
  it('Given the sign out button, should call the sign out endpoint', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(Response.json({ success: true })))
    mount()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await vi.waitFor(() =>
      expect(fetchSpy.mock.calls.map(([input]) => String(input))).toContainEqual(
        expect.stringContaining('/sign-out'),
      ),
    )
  })

  it('BH-2: Given a successful sign out, should leave the admin panel instead of keeping it on screen', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(Response.json({ success: true })),
    )
    mount()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await vi.waitFor(() => {
      const navigations = [router.push, router.replace, router.refresh].flatMap(
        (method) => method.mock.calls,
      )
      expect(navigations.length).toBeGreaterThan(0)
    })
  })

  it('BH-2: Given pending sign out, should show busy feedback', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    mount()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByRole('button', { name: /Sign out/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Sign out/ })).toHaveAttribute('aria-busy', 'true')
  })

  it('BH-2: Given sign out fails, should explain and enable retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: '::error::' }, { status: 500 }),
    )
    mount()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out. Try again.')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
  })
})
