import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider, useT } from './i18n-context'
import { getMessages } from './index'

const Probe = () => {
  const t = useT()
  return (
    <>
      <p>{t('common.retry')}</p>
      <p>{t('menu.signedInAs', { name: 'Ana' })}</p>
    </>
  )
}

describe('I18nProvider', () => {
  it('Given the en locale, should translate keys and interpolate variables', () => {
    render(
      <I18nProvider locale="en" messages={getMessages('en')}>
        <Probe />
      </I18nProvider>,
    )

    expect(screen.getByText('Retry')).toBeVisible()
    expect(screen.getByText('Signed in as Ana')).toBeVisible()
  })

  it('Given the es locale, should translate to spanish', () => {
    render(
      <I18nProvider locale="es" messages={getMessages('es')}>
        <Probe />
      </I18nProvider>,
    )

    expect(screen.getByText('Reintentar')).toBeVisible()
  })

  it('Given no provider, should throw', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Probe />)).toThrow('useT must be used within an I18nProvider')
  })
})
