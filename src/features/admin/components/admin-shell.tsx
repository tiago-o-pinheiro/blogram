'use client'

import { Images, Plus, UserRound, Settings, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

import { cn } from '@/design-system/ui/lib/cn'
import { SlidingPill } from '@/design-system/ui/sliding-pill'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'

type AdminShellProps = {
  children: ReactNode
}

type NavItem = {
  icon: LucideIcon
  href: string
  labelKey: TranslationKey
  isActive: (pathname: string) => boolean
}

const NEW_POST_PATH = '/admin/posts/new'

const NAV_ITEMS: readonly NavItem[] = [
  {
    icon: Images,
    href: '/admin/posts',
    labelKey: 'adminShell.posts',
    isActive: (pathname) => pathname.startsWith('/admin/posts') && pathname !== NEW_POST_PATH,
  },
  {
    icon: Plus,
    href: NEW_POST_PATH,
    labelKey: 'adminShell.newPost',
    isActive: (pathname) => pathname === NEW_POST_PATH,
  },
  {
    icon: UserRound,
    href: '/admin/profile',
    labelKey: 'adminShell.profile',
    isActive: (pathname) => pathname.startsWith('/admin/profile'),
  },
  {
    icon: Settings,
    href: '/admin/account',
    labelKey: 'adminShell.account',
    isActive: (pathname) => pathname.startsWith('/admin/account'),
  },
]

export const AdminShell = ({ children }: AdminShellProps) => {
  const t = useT()
  const pathname = usePathname()
  const activeHref = NAV_ITEMS.find((item) => item.isActive(pathname))?.href ?? ''

  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse md:justify-end">
      <div className="flex-1 pb-admin-nav md:pb-0">{children}</div>
      <nav
        aria-label={t('adminShell.navLabel')}
        className={cn(
          'fixed inset-x-3 bottom-nav-float z-20 animate-rise-in rounded-full glass p-1.5',
          'sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2',
          'md:sticky md:inset-x-0 md:top-0 md:bottom-auto md:left-auto md:max-w-none md:translate-x-0 md:animate-none md:rounded-none md:border-x-0 md:border-t-0 md:px-4 md:py-2',
        )}
      >
        <ul className="relative flex items-center gap-1 md:gap-2">
          <SlidingPill activeKey={activeHref} className="rounded-full bg-accent shadow-sm" />
          {NAV_ITEMS.map((item) => {
            const isCurrent = item.isActive(pathname)
            return (
              <li key={item.href} className="flex-1 md:flex-none">
                <Link
                  href={item.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  data-active={isCurrent || undefined}
                  className={cn(
                    'relative flex min-h-11 min-w-11 press flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-medium md:flex-row md:gap-2 md:py-2 md:text-sm',
                    'focus-visible:outline-2 focus-visible:outline-ring',
                    isCurrent
                      ? 'bg-accent text-accent-foreground shadow-sm pill-ready:bg-transparent pill-ready:shadow-none'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon
                    aria-hidden="true"
                    className={cn('size-5', isCurrent && 'animate-pop')}
                  />
                  {t(item.labelKey)}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
