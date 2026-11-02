import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMessages, type Locale } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import ErrorPage from './error'

const renderError = (locale: Locale, reset = vi.fn()) =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <ErrorPage reset={reset} />
    </I18nProvider>,
  )

describe('ErrorPage', () => {
  it('Given a failure, should explain it in plain language and offer a retry', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    renderError('en', reset)

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('heading', { name: 'Something went wrong on our side' })).toBeVisible()
    expect(reset).toHaveBeenCalledOnce()
  })

  it('Given a Spanish visitor, should show the error page in Spanish', () => {
    renderError('es')

    expect(screen.getByRole('heading', { name: 'Algo ha fallado por nuestra parte' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })
})
