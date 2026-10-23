'use client'

import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

export const GoogleSignIn = ({ hasCallbackError = false }: { hasCallbackError?: boolean }) => {
  const t = useT()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    setError('')
    setIsPending(true)
    try {
      const response = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/admin',
        errorCallbackURL: '/sign-in?google=error',
      })
      if (response.error) {
        setError(t('google.error'))
      }
    } catch {
      setError(t('google.error'))
    }
    setIsPending(false)
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Button variant="secondary" disabled={isPending} onClick={() => void handleSignIn()}>
        {t('google.signin')}
      </Button>
      {error || hasCallbackError ? (
        <p role="alert" className="text-sm text-danger">
          {error || t('google.error')}
        </p>
      ) : null}
    </div>
  )
}
