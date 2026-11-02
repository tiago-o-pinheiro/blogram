'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import { OWNER_PASSWORD_MAX } from '@/models/models'

import { PasswordField } from '@/components/password-field'
import { authClient } from '@/lib/auth-client'

import { readField } from '../lib/read-field'
import { signInOwner } from '../lib/sign-in-owner'

type GoogleAccountControlsProps = {
  isConfigured: boolean
  accountId: string | null
  signInName: string
  isSessionFresh: boolean
}

type Action = 'link' | 'unlink'

const OFFLINE_RESULT = { error: { status: 0 } }
const STALE_SESSION_STATUSES = new Set([401, 403])

export const GoogleAccountControls = ({
  isConfigured,
  accountId,
  signInName,
  isSessionFresh,
}: GoogleAccountControlsProps) => {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pendingAction, setPendingAction] = useState<Action | null>(null)
  const [reauthAction, setReauthAction] = useState<Action | null>(null)
  const [isFresh, setIsFresh] = useState(isSessionFresh)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [hasUnlinked, setHasUnlinked] = useState(false)
  const isLinked = accountId !== null && !hasUnlinked

  const request = async (action: Action): Promise<number | null> => {
    const response = await (
      action === 'link'
        ? authClient.linkSocial({
            provider: 'google',
            callbackURL: '/admin/account',
            errorCallbackURL: '/admin/account?google=error',
          })
        : authClient.unlinkAccount({ accountId: accountId ?? '' })
    ).catch(() => OFFLINE_RESULT)
    return response.error ? response.error.status : null
  }

  const perform = async (action: Action, hasJustConfirmed: boolean) => {
    setErrorKey(null)
    setPendingAction(action)
    const status = await request(action)
    setPendingAction(null)
    if (status === null) {
      setReauthAction(null)
      if (action === 'unlink') {
        setHasUnlinked(true)
        router.refresh()
      }
      return
    }
    if (STALE_SESSION_STATUSES.has(status) && !hasJustConfirmed) {
      setIsFresh(false)
      setReauthAction(action)
      return
    }
    setErrorKey('google.error')
  }

  const handleAction = (action: Action) => {
    if (isFresh) {
      void perform(action, false)
      return
    }
    setErrorKey(null)
    setReauthAction(action)
  }

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reauthAction || pendingAction) {
      return
    }
    const password = readField(new FormData(event.currentTarget), 'password')
    setErrorKey(null)
    setPendingAction(reauthAction)
    const { status } = await signInOwner(signInName, password)
    if (status !== null) {
      setPendingAction(null)
      setErrorKey(status === 401 ? 'recovery.codes.wrongPassword' : 'google.error')
      return
    }
    setIsFresh(true)
    await perform(reauthAction, true)
  }

  const renderAction = () => {
    if (reauthAction) {
      return (
        <form
          key="reauth"
          onSubmit={(event) => void handleConfirm(event)}
          className="flex animate-rise-in flex-col gap-3 rounded-md border border-line p-4"
        >
          <p className="font-medium">{t('google.reauth.title')}</p>
          <p className="text-sm text-muted-foreground">{t('google.reauth.hint')}</p>
          <PasswordField
            label={t('signin.password')}
            name="password"
            required
            autoComplete="current-password"
            maxLength={OWNER_PASSWORD_MAX}
            disabled={pendingAction !== null}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              isLoading={pendingAction !== null}
              loadingLabel={t('google.reauth.confirming')}
            >
              {t(reauthAction === 'link' ? 'google.reauth.link' : 'google.reauth.unlink')}
            </Button>
            <Button
              variant="ghost"
              disabled={pendingAction !== null}
              onClick={() => setReauthAction(null)}
            >
              {t('google.reauth.cancel')}
            </Button>
          </div>
        </form>
      )
    }
    if (isLinked) {
      return (
        <Button
          key="unlink"
          variant="secondary"
          className="animate-rise-in self-start"
          isLoading={pendingAction === 'unlink'}
          loadingLabel={t('google.unlink')}
          onClick={() => handleAction('unlink')}
        >
          {t('google.unlink')}
        </Button>
      )
    }
    if (isConfigured) {
      return (
        <Button
          key="link"
          className="animate-rise-in self-start"
          isLoading={pendingAction === 'link'}
          loadingLabel={t('google.linking')}
          onClick={() => handleAction('link')}
        >
          {t('google.link')}
        </Button>
      )
    }
    return (
      <p key="unavailable" className="animate-rise-in text-sm text-muted-foreground">
        {t('google.linkUnavailable')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {isLinked ? (
        <p key="linked" className="animate-rise-in text-sm">
          {t('google.linked')}
        </p>
      ) : null}
      {renderAction()}
      {errorKey || searchParams.get('google') === 'error' ? (
        <p role="alert" className="animate-rise-in text-sm text-danger">
          {t(errorKey ?? 'google.error')}
        </p>
      ) : null}
    </div>
  )
}
