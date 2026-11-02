import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { GoogleSetupGuide } from './google-setup-guide'

const ORIGIN = 'https://blog.example'
const REDIRECT_URI = `${ORIGIN}/api/auth/callback/google`

const renderGuide = (locale: 'en' | 'es' = 'en') =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <GoogleSetupGuide origin={ORIGIN} redirectUri={REDIRECT_URI} />
    </I18nProvider>,
  )

describe('GoogleSetupGuide', () => {
  it('Given the guide, should link each Google Cloud page in a new tab', () => {
    renderGuide()

    expect(screen.getByRole('link', { name: /Open Google Auth Platform/ })).toHaveAttribute(
      'target',
      '_blank',
    )
    expect(screen.getByRole('link', { name: /Create a client/ })).toHaveAttribute(
      'href',
      'https://console.cloud.google.com/auth/clients/create',
    )
  })

  it('Given the redirect URI, should copy it and announce it', async () => {
    const user = userEvent.setup()
    renderGuide()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()

    await user.click(screen.getByRole('button', { name: 'Copy Authorized redirect URI' }))

    expect(writeText).toHaveBeenCalledWith(REDIRECT_URI)
    expect(await screen.findByText('Authorized redirect URI copied')).toBeInTheDocument()
  })

  it('Given the JavaScript origin, should copy only the origin', async () => {
    const user = userEvent.setup()
    renderGuide('es')
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()

    await user.click(screen.getByRole('button', { name: 'Copiar Origen de JavaScript autorizado' }))

    expect(writeText).toHaveBeenCalledWith(ORIGIN)
  })

  it('Given a clipboard failure, should announce the fallback message', async () => {
    const user = userEvent.setup()
    renderGuide()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))

    await user.click(screen.getByRole('button', { name: 'Copy Authorized redirect URI' }))

    expect(await screen.findByText(/Could not copy/)).toBeInTheDocument()
  })
})
