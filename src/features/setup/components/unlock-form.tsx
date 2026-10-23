'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'

import { readField } from '@/features/auth/lib/read-field'

import { SetupApiError, unlockSetup } from '../api/setup-api'
import { toSetupMessageKey } from '../lib/to-setup-message'

const toUnlockMessageKey = (error: unknown): TranslationKey => {
  if (!(error instanceof SetupApiError)) {
    return 'errors.setup.generic'
  }
  return error.status === 401 ? 'unlock.error.wrong' : toSetupMessageKey(error.status)
}

export const UnlockForm = () => {
  const t = useT()
  const router = useRouter()
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const password = readField(new FormData(event.currentTarget), 'password')
    setErrorKey(null)
    setIsPending(true)
    try {
      await unlockSetup({ password })
    } catch (error) {
      setIsPending(false)
      setErrorKey(toUnlockMessageKey(error))
      return
    }
    router.replace('/admin/setup')
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t('unlock.title')}</h1>
      <p className="text-muted-foreground">{t('unlock.description')}</p>
      <Field
        label={t('unlock.password')}
        name="password"
        type="password"
        required
        autoComplete="off"
      />
      {errorKey ? (
        <p role="alert" className="text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel={t('unlock.submitting')}>
        {t('unlock.submit')}
      </Button>
    </form>
  )
}
