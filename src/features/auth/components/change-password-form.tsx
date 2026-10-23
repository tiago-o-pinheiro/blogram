'use client'

import { type FormEvent, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import { OWNER_PASSWORD_MAX } from '@/models/models'

import { PasswordField } from '@/components/password-field'
import { authClient } from '@/lib/auth-client'

import { readField } from '../lib/read-field'

const OFFLINE_RESULT = { error: { status: 0 } }

const toChangePasswordKey = (status: number): TranslationKey =>
  status === 400 ? 'account.errors.wrongCurrent' : 'account.errors.generic'

export const ChangePasswordForm = () => {
  const t = useT()
  const formRef = useRef<HTMLFormElement>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const currentPassword = readField(data, 'currentPassword')
    const newPassword = readField(data, 'newPassword')
    setIsDone(false)
    if (newPassword !== readField(data, 'confirmPassword')) {
      setErrorKey('account.errors.mismatch')
      return
    }
    setErrorKey(null)
    setIsPending(true)
    const result = await authClient
      .changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
      .catch(() => OFFLINE_RESULT)
    setIsPending(false)
    if (result.error) {
      setErrorKey(toChangePasswordKey(result.error.status))
      return
    }
    formRef.current?.reset()
    setIsDone(true)
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
    >
      <PasswordField
        label={t('account.currentPassword')}
        name="currentPassword"
        required
        autoComplete="current-password"
      />
      <PasswordField
        label={t('account.newPassword')}
        name="newPassword"
        required
        autoComplete="new-password"
        maxLength={OWNER_PASSWORD_MAX}
      />
      <PasswordField
        label={t('account.confirmPassword')}
        name="confirmPassword"
        required
        autoComplete="new-password"
        maxLength={OWNER_PASSWORD_MAX}
      />
      {errorKey ? (
        <p role="alert" className="text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      {isDone ? (
        <p role="status" className="text-sm text-foreground">
          {t('account.success')}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel={t('account.submitting')}>
        {t('account.submit')}
      </Button>
    </form>
  )
}
