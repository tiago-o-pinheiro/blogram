'use client'

import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { readField } from '@/features/auth/lib/read-field'

import { useSetupWizardActions, useSetupWizardState } from './setup-wizard-context'

const toOwnerErrorKey = (owner: Models.SetupOwner): TranslationKey | null => {
  if (!Models.toOwnerIdentifier(owner.identifier)) {
    return 'finalize.owner.errors.identifier'
  }
  if (
    owner.password.length < Models.OWNER_PASSWORD_MIN ||
    owner.password.length > Models.OWNER_PASSWORD_MAX
  ) {
    return 'finalize.owner.errors.passwordLength'
  }
  if (!Models.hasMatchingPasswords(owner)) {
    return 'finalize.owner.errors.passwordMismatch'
  }
  return null
}

export const OwnerStep = () => {
  const t = useT()
  const { owner } = useSetupWizardState()
  const { setOwner, goTo } = useSetupWizardActions()
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nextOwner: Models.SetupOwner = {
      identifier: readField(data, 'identifier').trim(),
      password: readField(data, 'password'),
      passwordConfirmation: readField(data, 'passwordConfirmation'),
    }
    const nextErrorKey = toOwnerErrorKey(nextOwner)
    setErrorKey(nextErrorKey)
    if (nextErrorKey) {
      return
    }
    setOwner(nextOwner)
    goTo(3)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('finalize.owner.title')}</h2>
      <Field
        label={t('finalize.owner.identifier')}
        name="identifier"
        required
        autoComplete="username"
        defaultValue={owner.identifier}
      />
      <Field
        label={t('finalize.owner.password')}
        name="password"
        type="password"
        required
        autoComplete="new-password"
        defaultValue={owner.password}
      />
      <p className="text-sm text-muted-foreground">
        {t('finalize.owner.passwordHint', {
          min: Models.OWNER_PASSWORD_MIN,
          max: Models.OWNER_PASSWORD_MAX,
        })}
      </p>
      <Field
        label={t('finalize.owner.passwordConfirmation')}
        name="passwordConfirmation"
        type="password"
        required
        autoComplete="new-password"
        defaultValue={owner.passwordConfirmation}
      />
      {errorKey ? (
        <p role="alert" className="text-sm text-danger">
          {t(errorKey, { min: Models.OWNER_PASSWORD_MIN, max: Models.OWNER_PASSWORD_MAX })}
        </p>
      ) : null}
      <div className="flex justify-between gap-4">
        <Button variant="secondary" onClick={() => goTo(1)}>
          {t('finalize.owner.back')}
        </Button>
        <Button type="submit">{t('finalize.owner.continue')}</Button>
      </div>
    </form>
  )
}
