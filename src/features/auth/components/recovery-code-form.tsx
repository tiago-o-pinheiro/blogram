'use client'

import Link from 'next/link'
import { type FormEvent, useState } from 'react'

import { Button, buttonVariants } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN, RECOVERY_CODE_INPUT_MAX } from '@/models/models'

import { PasswordField } from '@/components/password-field'

import { RecoveryCodesApiError, redeemRecoveryCode } from '../api/recovery-codes-api'
import { readField } from '../lib/read-field'

const toRedeemErrorKey = (error: unknown): TranslationKey => {
  if (!(error instanceof RecoveryCodesApiError)) {
    return 'recovery.error'
  }
  if (error.status === 401 || error.status === 422) {
    return 'recovery.codes.invalid'
  }
  return error.status === 429 ? 'recovery.rateLimit' : 'recovery.error'
}

export const RecoveryCodeForm = () => {
  const t = useT()
  const [identifier, setIdentifier] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
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
    try {
      const redeemed = await redeemRecoveryCode({ code: readField(data, 'code'), newPassword })
      form.reset()
      setIdentifier(redeemed.identifier)
    } catch (error) {
      setErrorKey(toRedeemErrorKey(error))
    } finally {
      setIsPending(false)
    }
  }

  if (identifier) {
    return (
      <div role="status" className="flex animate-rise-in flex-col gap-4">
        <p>{t('recovery.codes.success')}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {t('recovery.codes.identifier')}
          <strong className="animate-scale-in rounded-md bg-muted px-3 py-1 font-mono text-foreground">
            {identifier}
          </strong>
        </p>
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
      <Field
        label={t('recovery.codes.code')}
        name="code"
        required
        placeholder="XXXX-XXXX-XXXX"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={RECOVERY_CODE_INPUT_MAX}
        disabled={isPending}
      />
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
      <Button type="submit" isLoading={isPending} loadingLabel={t('recovery.resetting')}>
        {t('recovery.reset')}
      </Button>
    </form>
  )
}
