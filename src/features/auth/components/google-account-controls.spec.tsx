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

const mount = (isConfigured: boolean, accountId: string | null = null) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <GoogleAccountControls
        isConfigured={isConfigured}
        accountId={accountId}
        callbackURL="https://journal.example.com/api/auth/callback/google"
      />
    </I18nProvider>,
  )

describe('Google account controls', () => {
  it('Given no OAuth credentials, should explain configuration and show no activation control', () => {
    mount(false)

    expect(screen.getByText(/GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/)).toBeInTheDocument()
    expect(
      screen.getByText('https://journal.example.com/api/auth/callback/google'),
    ).toBeInTheDocument()
    expect(screen.getByText('https://<yourdomain>/api/auth/callback/google')).toBeVisible()
    expect(screen.getByText(/Replace <yourdomain>/)).toHaveTextContent('Railway')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('Given a linked Google account, should unlink that account and retain linking as an option', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ status: true }))
    mount(true, 'linked-google-id')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Unlink Google' }))

    expect(await screen.findByRole('button', { name: 'Link Google' })).toBeInTheDocument()
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain('linked-google-id')
    expect(router.refresh).toHaveBeenCalled()
  })

  it('Given an expired fresh session, should explain how to sign in again', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 403 }))
    mount(true)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Link Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign out and sign back in with your password',
    )
  })

  it('Given a failed unlink, should preserve the linked state and show an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    mount(true, 'linked-google-id')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Unlink Google' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlink Google' })).toBeInTheDocument()
  })
})
