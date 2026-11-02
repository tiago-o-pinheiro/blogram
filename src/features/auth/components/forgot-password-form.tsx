'use client'

import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'

import { authClient } from '@/lib/auth-client'

import { readField } from '../lib/read-field'

const OFFLINE_RESULT = { error: { status: 0 } }

export const ForgotPasswordForm = () => {
  const t = useT()
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) {
      return
    }
    const data = new FormData(event.currentTarget)
    setErrorKey(null)
    setIsPending(true)
    const response = await authClient
      .requestPasswordReset({
        email: readField(data, 'email').trim().toLowerCase(),
        redirectTo: '/reset-password',
      })
      .catch(() => OFFLINE_RESULT)
    setIsPending(false)
    if (response.error) {
      setErrorKey(response.error.status === 429 ? 'recovery.rateLimit' : 'recovery.error')
      return
    }
    setIsDone(true)
  }

  if (isDone) {
    return (
      <p role="status" className="animate-rise-in text-sm text-foreground">
        {t('recovery.sent')}
      </p>
    )
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex animate-rise-in flex-col gap-4"
    >
      <Field
        label={t('recovery.email')}
        name="email"
        type="email"
        required
        autoComplete="email"
        disabled={isPending}
      />
      {errorKey ? (
        <p key={errorKey} role="alert" className="animate-rise-in text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel={t('recovery.sending')}>
        {t('recovery.send')}
      </Button>
    </form>
  )
}
