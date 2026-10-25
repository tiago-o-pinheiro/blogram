import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { JournalNav } from './journal-nav'

const renderNav = () =>
  render(
    <I18nProvider locale="en" messages={getMessages('en')}>
      <JournalNav />
    </I18nProvider>,
  )

describe('JournalNav', () => {
  it('Given the home page, should link to archive, places and the RSS feed', () => {
    renderNav()

    expect(screen.getByRole('navigation', { name: 'Explore the journal' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Archive' })).toHaveAttribute('href', '/archive')
    expect(screen.getByRole('link', { name: 'Places' })).toHaveAttribute('href', '/places')
    expect(screen.getByRole('link', { name: 'RSS feed' })).toHaveAttribute('href', '/feed.xml')
  })

  it('Given the links, should have 44px targets and entrance motion', () => {
    renderNav()

    screen.getAllByRole('link').forEach((link) => {
      expect(link).toHaveClass('min-h-11')
      expect(link).toHaveClass('animate-rise-in')
    })
  })
})
