'use client'

import Link from 'next/link'
import { type FormEvent, useState } from 'react'

import { Button, buttonVariants } from '@/design-system/ui/button'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN } from '@/models/models'

import { PasswordField } from '@/components/password-field'
import { authClient } from '@/lib/auth-client'

import { readField } from '../lib/read-field'

const OFFLINE_RESULT = { error: { status: 0 } }

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const t = useT()
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) {
      return
    }
    const form = event.currentTarget
    const data = new FormData(form)
    const newPassword = readField(data, 'newPassword')
    if (newPassword !== readField(data, 'confirmPassword')) {
      setErrorKey('account.errors.mismatch')
      return
    }
    setErrorKey(null)
    setIsPending(true)
    const response = await authClient
      .resetPassword({ token, newPassword })
      .catch(() => OFFLINE_RESULT)
    setIsPending(false)
    if (response.error) {
      setErrorKey(
        response.error.status === 400
          ? 'recovery.invalid'
          : response.error.status === 429
            ? 'recovery.rateLimit'
            : 'recovery.error',
      )
      return
    }
    form.reset()
    window.history.replaceState(null, '', '/reset-password')
    setIsDone(true)
  }

  if (isDone) {
    return (
      <div className="flex animate-rise-in flex-col gap-4">
        <p role="status">{t('recovery.success')}</p>
        <Link href="/sign-in" className={buttonVariants()}>
          {t('signin.submit')}
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex animate-rise-in flex-col gap-4"
    >
      <PasswordField
        label={t('account.newPassword')}
        name="newPassword"
        required
        autoComplete="new-password"
        minLength={OWNER_PASSWORD_MIN}
        maxLength={OWNER_PASSWORD_MAX}
        disabled={isPending}
      />
      <PasswordField
        label={t('account.confirmPassword')}
        name="confirmPassword"
        required
        autoComplete="new-password"
        minLength={OWNER_PASSWORD_MIN}
        maxLength={OWNER_PASSWORD_MAX}
        disabled={isPending}
      />
      {errorKey ? (
        <p key={errorKey} role="alert" className="animate-rise-in text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      {errorKey === 'recovery.invalid' ? (
        <Link href="/forgot-password" className={buttonVariants({ variant: 'secondary' })}>
          {t('recovery.retry')}
        </Link>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel={t('recovery.resetting')}>
        {t('recovery.reset')}
      </Button>
    </form>
  )
}
