'use client'

import { type FormEvent, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN } from '@/models/models'

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
    if (newPassword.length < OWNER_PASSWORD_MIN || newPassword.length > OWNER_PASSWORD_MAX) {
      setErrorKey('account.errors.length')
      return
    }
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
      <Field
        label={t('account.currentPassword')}
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
      />
      <Field
        label={t('account.newPassword')}
        name="newPassword"
        type="password"
        required
        autoComplete="new-password"
      />
      <Field
        label={t('account.confirmPassword')}
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
      />
      {errorKey ? (
        <p role="alert" className="text-sm text-danger">
          {t(errorKey, { min: OWNER_PASSWORD_MIN, max: OWNER_PASSWORD_MAX })}
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
