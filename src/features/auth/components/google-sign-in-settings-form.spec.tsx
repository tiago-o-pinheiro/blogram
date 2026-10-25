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

const REDIRECT_URI = 'https://blog.example/api/auth/callback/google'

const SETTINGS: GoogleSignInSettings = {
  source: 'settings',
  isEnabled: true,
  clientId: 'abc.apps.googleusercontent.com',
  hasClientSecret: true,
  redirectUri: REDIRECT_URI,
}

const ENV_SETTINGS: GoogleSignInSettings = {
  ...SETTINGS,
  source: 'env',
  clientId: 'env-id.apps.googleusercontent.com',
}

const renderForm = (settings: GoogleSignInSettings = SETTINGS) =>
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

describe('GoogleSignInSettingsForm', () => {
  it('Given settings source, should show the switch, client ID and an empty secret with its hint', () => {
    renderForm()

    expect(screen.getByRole('switch', { name: 'Enable Google sign-in' })).toBeChecked()
    expect(screen.getByLabelText('Client ID')).toHaveValue(SETTINGS.clientId)
    expect(screen.getByLabelText('Client Secret')).toHaveValue('')
    expect(screen.getByText('A secret is saved. Leave empty to keep it.')).toBeInTheDocument()
  })

  it('Given no typed secret, should save trimmed values without a secret and refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SETTINGS))
    renderForm()

    await user.type(screen.getByLabelText('Client ID'), '  ')
    await user.click(screen.getByRole('button', { name: 'Save Google settings' }))

    expect(await screen.findByText('Google settings saved')).toBeInTheDocument()
    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(JSON.parse(String(body))).toEqual({
      isEnabled: true,
      clientId: SETTINGS.clientId,
    })
    expect(refresh).toHaveBeenCalled()
  })

  it('Given a typed secret, should send it then clear the input', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(SETTINGS))
    renderForm()

    await user.type(screen.getByLabelText('Client Secret'), 'GOCSPX-secret')
    await user.click(screen.getByRole('button', { name: 'Save Google settings' }))

    await screen.findByText('Google settings saved')
    const body = fetchSpy.mock.calls[0]?.[1]?.body
    expect(JSON.parse(String(body))).toMatchObject({ clientSecret: 'GOCSPX-secret' })
    expect(screen.getByLabelText('Client Secret')).toHaveValue('')
  })

  it('Given a 422 answer, should show the invalid alert', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 422 }))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save Google settings' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('These settings are not valid')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('Given a 500 answer, should show the generic alert', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}, { status: 500 }))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save Google settings' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved')
  })

  it('Given env source, should show the notice, disabled controls and no secret or save button', () => {
    renderForm(ENV_SETTINGS)

    expect(screen.getByText(/managed by the GOOGLE_CLIENT_ID/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Enable Google sign-in' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Enable Google sign-in' })).toBeChecked()
    expect(screen.getByLabelText('Client ID')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Client ID')).toHaveValue(ENV_SETTINGS.clientId)
    expect(screen.queryByLabelText('Client Secret')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save Google settings' })).not.toBeInTheDocument()
  })

  it('Given the redirect URI, should copy it and announce it', async () => {
    const user = userEvent.setup()
    renderForm()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()

    expect(screen.getByText(REDIRECT_URI)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy redirect URI' }))

    expect(writeText).toHaveBeenCalledWith(REDIRECT_URI)
    expect(await screen.findByText('Redirect URI copied')).toBeInTheDocument()
  })

  it('Given a clipboard failure, should announce the fallback message', async () => {
    const user = userEvent.setup()
    renderForm(ENV_SETTINGS)
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))

    await user.click(screen.getByRole('button', { name: 'Copy redirect URI' }))

    expect(await screen.findByText(/Could not copy/)).toBeInTheDocument()
  })
})
