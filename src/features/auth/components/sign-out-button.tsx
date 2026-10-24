'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

export const SignOutButton = () => {
  const t = useT()
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
    <div className="flex flex-col items-start gap-3">
      {' '}
      {hasSignOutError ? (
        <p role="alert" className="animate-rise-in px-2 text-sm text-danger">
          {t('adminShell.signOutError')}
        </p>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        disabled={isSigningOut}
        isLoading={isSigningOut}
        loadingLabel={t('adminShell.signingOut')}
        onClick={() => void handleSignOut()}
      >
        <LogOut aria-hidden="true" className="size-4" />
        {t('adminShell.signOut')}
      </Button>
    </div>
  )
}
