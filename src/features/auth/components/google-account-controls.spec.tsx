import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { GoogleAccountControls } from './google-account-controls'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}))

const PASSWORD = '::password::-12345'
const SIGN_IN_NAME = 'owner@example.test'

type MountOptions = { isConfigured?: boolean; accountId?: string | null; isSessionFresh?: boolean }

const mount = ({
  isConfigured = true,
  accountId = null,
  isSessionFresh = true,
}: MountOptions = {}) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <GoogleAccountControls
        isConfigured={isConfigured}
        accountId={accountId}
        signInName={SIGN_IN_NAME}
        isSessionFresh={isSessionFresh}
      />
    </I18nProvider>,
  )

const toPaths = (calls: ReadonlyArray<Parameters<typeof fetch>>) =>
  calls.map(([input]) => new URL(String(input), 'http://localhost').pathname)

describe('Google account controls', () => {
  it('Given no OAuth credentials and no link, should point to step 2 without a Link button', () => {
    mount({ isConfigured: false })

    expect(screen.getByText('Save the credentials in step 2 first.')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('Given a linked Google account, should unlink that account and offer linking again', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ status: true }))
    mount({ accountId: 'linked-google-id' })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Unlink Google' }))

    expect(await screen.findByRole('button', { name: 'Link Google' })).toBeInTheDocument()
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain('linked-google-id')
    expect(router.refresh).toHaveBeenCalled()
  })

  it('Given an old session, should ask for the password before linking Google', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    mount({ isSessionFresh: false })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Link Google' }))

    expect(screen.getByLabelText('Password')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Confirm and link Google' })).toBeVisible()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Given the confirmed password, should sign in again and then start linking', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ token: '::token::' }))
      .mockResolvedValueOnce(Response.json({ url: '/admin/account', redirect: false }))
    mount({ isSessionFresh: false })
    await user.click(screen.getByRole('button', { name: 'Link Google' }))

    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Confirm and link Google' }))

    expect(await screen.findByRole('button', { name: 'Link Google' })).toBeVisible()
    expect(toPaths(fetchSpy.mock.calls)).toEqual([
      '/api/auth/sign-in/email',
      '/api/auth/link-social',
    ])
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain(SIGN_IN_NAME)
  })

  it('Given a session that expired after loading, should switch to the password prompt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 403 }))
    mount()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Link Google' }))

    expect(await screen.findByRole('button', { name: 'Confirm and link Google' })).toBeVisible()
  })

  it('Given a wrong confirmation password, should say so and keep the prompt', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 401 }))
    mount({ accountId: 'linked-google-id', isSessionFresh: false })
    await user.click(screen.getByRole('button', { name: 'Unlink Google' }))

    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Confirm and unlink Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your current password is wrong.')
    expect(screen.getByLabelText('Password')).toBeVisible()
  })

  it('Given a failed unlink, should preserve the linked state and show an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    mount({ accountId: 'linked-google-id' })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Unlink Google' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlink Google' })).toBeInTheDocument()
  })
})
