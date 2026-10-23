import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { PendingSite } from './pending-site'

describe('PendingSite', () => {
  it('Given the english locale, should show a neutral message without links', () => {
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <PendingSite />
      </I18nProvider>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'This site is not set up yet' }),
    ).toBeVisible()
    expect(screen.getByText('Please check back soon.')).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('Given the spanish locale, should show the translated message', () => {
    render(
      <I18nProvider locale="es" messages={getMessages('es')}>
        <PendingSite />
      </I18nProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Este sitio aún no está configurado' }),
    ).toBeVisible()
  })
})
