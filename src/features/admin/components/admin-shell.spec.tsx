import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMessages } from '@/i18n'
import { I18nProvider } from '@/i18n/i18n-context'

import { AdminShell } from './admin-shell'

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}))

vi.mock('next/navigation', () => ({ usePathname: vi.fn(), useRouter: () => router }))

const renderShell = (pathname: string, locale: 'en' | 'es' = 'en') => {
  vi.mocked(usePathname).mockReturnValue(pathname)
  return render(
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <AdminShell>
        <p>::content::</p>
      </AdminShell>
    </I18nProvider>,
  )
}

describe('AdminShell', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Given the shell, should show the four nav items and the children', () => {
    renderShell('/admin/posts')

    const nav = screen.getByRole('navigation', { name: 'Admin' })
    expect(nav).toBeVisible()
    expect(screen.getByRole('link', { name: 'Feed' })).toHaveAttribute('href', '/admin/posts')
    expect(screen.getByRole('link', { name: 'New' })).toHaveAttribute('href', '/admin/posts/new')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/admin/profile')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/admin/account')
    expect(screen.getByText('::content::')).toBeVisible()
  })

  it.each([
    ['/admin/posts', 'Feed'],
    ['/admin/posts/AbCdEfGhIj', 'Feed'],
    ['/admin/posts/new', 'New'],
    ['/admin/profile', 'Profile'],
    ['/admin/account', 'Account'],
  ])('Given path %s, should mark only %s as current', (pathname, label) => {
    renderShell(pathname)

    const current = screen.getAllByRole('link').filter((link) => link.ariaCurrent === 'page')
    expect(current).toHaveLength(1)
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
  })

  it('Given every nav target, should be at least 44px tall', () => {
    renderShell('/admin/posts')

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveClass('min-h-11', 'min-w-11')
    }
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('Given the es locale, should translate the nav labels', () => {
    renderShell('/admin/posts', 'es')

    expect(screen.getByRole('link', { name: 'Publicaciones' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })
})
