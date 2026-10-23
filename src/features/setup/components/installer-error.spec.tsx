import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { InstallerError } from './installer-error'

describe('InstallerError', () => {
  it('Given an unconfigured server, should explain SETUP_PASSWORD as an alert', () => {
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <InstallerError />
      </I18nProvider>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('SETUP_PASSWORD')
    expect(screen.getByRole('alert')).toHaveTextContent('at least 12 characters')
    expect(screen.getByRole('heading', { name: 'Setup is not configured' })).toBeVisible()
  })

  it('Given the es locale, should render translated text', () => {
    render(
      <I18nProvider locale="es" messages={getMessages('es')}>
        <InstallerError />
      </I18nProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'La configuración no está preparada' }),
    ).toBeVisible()
  })
})
