'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

type GoogleAccountControlsProps = {
  isConfigured: boolean
  accountId: string | null
}

export const GoogleAccountControls = ({ isConfigured, accountId }: GoogleAccountControlsProps) => {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [hasUnlinked, setHasUnlinked] = useState(false)

  const handleLink = async () => {
    setError('')
    setIsPending(true)
    try {
      const response = await authClient.linkSocial({
        provider: 'google',
        callbackURL: '/admin/account',
        errorCallbackURL: '/admin/account?google=error',
      })
      if (response.error) {
        setError(t('google.reauthenticate'))
      }
    } catch {
      setError(t('google.error'))
    }
    setIsPending(false)
  }

  const handleUnlink = async () => {
    if (!accountId) {
      return
    }
    setError('')
    setIsPending(true)
    try {
      const response = await authClient.unlinkAccount({ accountId })
      if (response.error) {
        setError(t('google.reauthenticate'))
      } else {
        setHasUnlinked(true)
        router.refresh()
      }
    } catch {
      setError(t('google.error'))
    }
    setIsPending(false)
  }

  return (
    <>
      {accountId && !hasUnlinked ? (
        <>
          <p className="text-sm">{t('google.linked')}</p>
          <Button variant="secondary" disabled={isPending} onClick={() => void handleUnlink()}>
            {t('google.unlink')}
          </Button>
        </>
      ) : isConfigured ? (
        <Button variant="secondary" disabled={isPending} onClick={() => void handleLink()}>
          {t('google.link')}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t('google.linkUnavailable')}</p>
      )}
      {error || searchParams.get('google') === 'error' ? (
        <p role="alert" className="animate-rise-in text-sm text-danger">
          {error || t('google.error')}
        </p>
      ) : null}
    </>
  )
}
