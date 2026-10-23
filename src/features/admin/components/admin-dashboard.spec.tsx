import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { AdminDashboard } from './admin-dashboard'

describe('AdminDashboard', () => {
  it('Given an owner name, should welcome them and link to the account page', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <AdminDashboard name="::owner::" />
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome, ::owner::' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/admin/account',
    )
  })

  it('Given the es locale, should welcome in spanish', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))

    render(
      <I18nProvider locale="es" messages={getMessages('es')}>
        <AdminDashboard name="::owner::" />
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Bienvenido, ::owner::' })).toBeVisible()
  })
})
