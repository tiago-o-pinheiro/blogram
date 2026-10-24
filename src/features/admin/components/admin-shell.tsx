'use client'

import { Images, Plus, UserRound, Settings, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

import { cn } from '@/design-system/ui/lib/cn'
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

  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse md:justify-end">
      <div className="flex-1 pb-admin-nav md:pb-0">{children}</div>
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 flex items-center border-t border-border/20 glass pb-safe shadow-md',
          'md:sticky md:top-0 md:border-t-0 md:border-b md:pb-0 md:shadow-none',
        )}
      >
        <nav aria-label={t('adminShell.navLabel')} className="flex flex-1 items-center">
          <ul className="flex flex-1 items-center justify-around px-2 py-2 md:justify-start md:gap-2 md:px-4">
            {NAV_ITEMS.map((item) => {
              const isCurrent = item.isActive(pathname)
              return (
                <li key={item.href} className="flex-1 md:flex-none">
                  <Link
                    href={item.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none md:flex-row md:gap-2 md:text-sm',
                      'focus-visible:outline-2 focus-visible:outline-ring',
                      isCurrent
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-5" />
                    {t(item.labelKey)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
