'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

type GoogleAccountControlsProps = {
  isConfigured: boolean
  accountId: string | null
  callbackURL: string
}

export const GoogleAccountControls = ({
  isConfigured,
  accountId,
  callbackURL,
}: GoogleAccountControlsProps) => {
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
    <section
      aria-labelledby="google-title"
      className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5"
    >
      <h2 id="google-title" className="text-lg font-semibold">
        {t('google.title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('google.description')}</p>
      {!isConfigured ? (
        <div className="flex flex-col gap-2 rounded-md bg-surface p-4 text-sm">
          <p>{t('google.configure')}</p>
          <code className="break-all">{'https://<yourdomain>/api/auth/callback/google'}</code>
          <p>{t('google.domainHint')}</p>
          <p className="font-medium">{t('google.configuredCallback')}</p>
          <code className="break-all">{callbackURL}</code>
        </div>
      ) : null}
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
      ) : null}
      {error || searchParams.get('google') === 'error' ? (
        <p role="alert" className="text-sm text-danger">
          {error || t('google.error')}
        </p>
      ) : null}
    </section>
  )
}
