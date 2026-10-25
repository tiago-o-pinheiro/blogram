import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { AccountSectionNav, type AccountSection } from './account-section-nav'

const renderNav = (activeSection: AccountSection, locale: 'en' | 'es' = 'en') =>
  render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <AccountSectionNav activeSection={activeSection} />
    </I18nProvider>,
  )

describe('AccountSectionNav', () => {
  it('Given the menu, should link Security, AI assistant and Data to their sections', () => {
    renderNav('security')

    expect(screen.getByRole('navigation', { name: 'Account sections' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute(
      'href',
      '?section=security',
    )
    expect(screen.getByRole('link', { name: 'AI assistant' })).toHaveAttribute(
      'href',
      '?section=ai',
    )
    expect(screen.getByRole('link', { name: 'Data' })).toHaveAttribute('href', '?section=data')
  })

  it('Given the ai section is active, should mark only that link as current', () => {
    renderNav('ai')

    expect(screen.getByRole('link', { name: 'AI assistant' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Security' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Data' })).not.toHaveAttribute('aria-current')
  })

  it('Given the Spanish locale, should translate the labels', () => {
    renderNav('security', 'es')

    expect(screen.getByRole('navigation', { name: 'Secciones de la cuenta' })).toBeVisible()
  })
})
