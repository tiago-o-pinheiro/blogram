'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useState } from 'react'

import { cn } from '@/design-system/ui'
import { Button } from '@/design-system/ui/button'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

type AdminShellProps = {
  children: ReactNode
}

type NavItem = {
  href: string
  labelKey: TranslationKey
  isActive: (pathname: string) => boolean
}

const NEW_POST_PATH = '/admin/posts/new'

const NAV_ITEMS: readonly NavItem[] = [
  {
    href: '/admin/posts',
    labelKey: 'adminShell.posts',
    isActive: (pathname) => pathname.startsWith('/admin/posts') && pathname !== NEW_POST_PATH,
  },
  {
    href: NEW_POST_PATH,
    labelKey: 'adminShell.newPost',
    isActive: (pathname) => pathname === NEW_POST_PATH,
  },
  {
    href: '/admin/profile',
    labelKey: 'adminShell.profile',
    isActive: (pathname) => pathname.startsWith('/admin/profile'),
  },
  {
    href: '/admin/account',
    labelKey: 'adminShell.account',
    isActive: (pathname) => pathname.startsWith('/admin/account'),
  },
]

export const AdminShell = ({ children }: AdminShellProps) => {
  const t = useT()
  const pathname = usePathname()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [hasSignOutError, setHasSignOutError] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setHasSignOutError(false)
    try {
      const { error } = await authClient.signOut()
      if (error) {
        setHasSignOutError(true)
        return
      }
      router.replace('/sign-in')
      router.refresh()
    } catch {
      setHasSignOutError(true)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse md:justify-end">
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-10 flex items-center border-t border-border bg-background',
          'md:static md:border-t-0 md:border-b',
        )}
      >
        <nav aria-label={t('adminShell.navLabel')} className="flex flex-1 items-center">
          <ul className="flex flex-1 items-center justify-around md:justify-start md:gap-2 md:px-4">
            {NAV_ITEMS.map((item) => {
              const isCurrent = item.isActive(pathname)
              return (
                <li key={item.href} className="flex-1 md:flex-none">
                  <Link
                    href={item.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 min-w-11 items-center justify-center px-3 text-sm font-medium',
                      'focus-visible:outline-2 focus-visible:outline-ring',
                      isCurrent ? 'text-foreground underline' : 'text-muted-foreground',
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        {hasSignOutError ? (
          <p role="alert" className="px-2 text-sm text-danger">
            {t('adminShell.signOutError')}
          </p>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={isSigningOut}
          isLoading={isSigningOut}
          loadingLabel={t('adminShell.signingOut')}
          onClick={() => void handleSignOut()}
        >
          {t('adminShell.signOut')}
        </Button>
      </div>
    </div>
  )
}
