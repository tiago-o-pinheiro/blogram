import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { LanguageForm } from './language-form'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const renderForm = (defaultLocale: 'en' | 'es' = 'en') =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <LanguageForm settings={{ defaultLocale }} />
    </I18nProvider>,
  )

beforeEach(() => {
  refresh.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LanguageForm', () => {
  it('Given the site settings, should preselect the default language', () => {
    renderForm('es')

    expect(screen.getByLabelText('Default site language')).toHaveValue('es')
  })

  it('Given a new language and Save, should put the settings and refresh', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ defaultLocale: 'es' }))
    renderForm()

    await user.selectOptions(screen.getByLabelText('Default site language'), 'es')
    await user.click(screen.getByRole('button', { name: 'Save language' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Language saved.')
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/settings',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ defaultLocale: 'es' }) }),
    )
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('Given a failed save, should show the translated error and not refresh', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 422 }))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save language' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Some of the information is not valid.',
    )
    expect(refresh).not.toHaveBeenCalled()
  })

  it('Given a pending save, should disable the select and the button', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save language' }))

    expect(await screen.findByLabelText('Default site language')).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
