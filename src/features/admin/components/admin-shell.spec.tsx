import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(screen.getByRole('link', { name: 'Posts' })).toHaveAttribute('href', '/admin/posts')
    expect(screen.getByRole('link', { name: 'New post' })).toHaveAttribute(
      'href',
      '/admin/posts/new',
    )
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/admin/profile')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/admin/account')
    expect(screen.getByText('::content::')).toBeVisible()
  })

  it.each([
    ['/admin/posts', 'Posts'],
    ['/admin/posts/AbCdEfGhIj', 'Posts'],
    ['/admin/posts/new', 'New post'],
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
    expect(screen.getByRole('button', { name: 'Sign out' })).toHaveClass('min-h-11')
  })

  it('Given the sign out button, should call the sign out endpoint', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(Response.json({ success: true })))
    renderShell('/admin/posts')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await vi.waitFor(() =>
      expect(fetchSpy.mock.calls.map(([input]) => String(input))).toContainEqual(
        expect.stringContaining('/sign-out'),
      ),
    )
  })

  it('BH-2: Given a successful sign out, should leave the admin panel instead of keeping it on screen', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(Response.json({ success: true })),
    )
    renderShell('/admin/posts')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await vi.waitFor(() => {
      const navigations = [router.push, router.replace, router.refresh].flatMap(
        (method) => method.mock.calls,
      )
      expect(navigations.length).toBeGreaterThan(0)
    })
  })

  it('BH-2: Given pending sign out, should show busy feedback', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    renderShell('/admin/posts')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByRole('button', { name: /Sign out/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Sign out/ })).toHaveAttribute('aria-busy', 'true')
  })

  it('BH-2: Given sign out fails, should explain and enable retry', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: '::error::' }, { status: 500 }),
    )
    renderShell('/admin/posts')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out. Try again.')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
  })

  it('Given the es locale, should translate the nav labels', () => {
    renderShell('/admin/posts', 'es')

    expect(screen.getByRole('link', { name: 'Publicaciones' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
  })
})
