import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'
import { type GoogleSignInSettings } from '@/models/models'

import { GoogleSignInSettingsForm } from './google-sign-in-settings-form'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const SETTINGS: GoogleSignInSettings = {
  source: 'settings',
  isEnabled: true,
  clientId: 'abc.apps.googleusercontent.com',
  hasClientSecret: true,
  redirectUri: 'https://blog.example/api/auth/callback/google',
}

const renderForm = (settings: GoogleSignInSettings) =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <GoogleSignInSettingsForm settings={settings} />
    </I18nProvider>,
  )

beforeEach(() => {
  refresh.mockReset()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GoogleSignInSettingsForm edge cases', () => {
  it('BH-2: Given a whitespace-only secret, should save without a secret instead of sending an empty one', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SETTINGS))
    renderForm(SETTINGS)

    await user.type(screen.getByLabelText('Client Secret'), '   ')
    await user.click(screen.getByRole('button', { name: 'Save Google settings' }))

    expect(await screen.findByText('Google settings saved')).toBeInTheDocument()
    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(JSON.parse(String(body))).toEqual({ isEnabled: true, clientId: SETTINGS.clientId })
  })
})
