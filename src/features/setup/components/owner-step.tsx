'use client'

import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { PasswordField } from '@/components/password-field'
import { readField } from '@/features/auth/lib/read-field'

import { useSetupWizardActions, useSetupWizardState } from './setup-wizard-context'

const toOwnerErrorKey = (owner: Models.SetupOwner): TranslationKey | null => {
  if (!Models.toOwnerIdentifier(owner.identifier)) {
    return 'finalize.owner.errors.identifier'
  }
  if (!Models.hasMatchingPasswords(owner)) {
    return 'finalize.owner.errors.passwordMismatch'
  }
  return null
}

const OwnerAside = () => {
  const t = useT()

  return (
    <aside className="flex animate-rise-in flex-col gap-6 rounded-xl border border-line bg-surface-soft p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-primary">
        <KeyRound className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{t('wizard.owner.asideTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('wizard.owner.asideDescription')}
        </p>
      </div>
      <p className="flex items-start gap-3 border-t border-line pt-5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        {t('wizard.owner.privateHint')}
      </p>
    </aside>
  )
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
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          label={t('finalize.owner.identifier')}
          name="identifier"
          required
          autoComplete="username"
          defaultValue={owner.identifier}
          className="min-h-12 rounded-lg"
          placeholder={t('wizard.owner.identifierPlaceholder')}
        />
        <PasswordField
          label={t('finalize.owner.password')}
          name="password"
          required
          autoComplete="new-password"
          defaultValue={owner.password}
          maxLength={Models.OWNER_PASSWORD_MAX}
          className="min-h-12 rounded-lg"
          hint={t('finalize.owner.passwordHint', { max: Models.OWNER_PASSWORD_MAX })}
        />
        <PasswordField
          label={t('finalize.owner.passwordConfirmation')}
          name="passwordConfirmation"
          required
          autoComplete="new-password"
          defaultValue={owner.passwordConfirmation}
          maxLength={Models.OWNER_PASSWORD_MAX}
          className="min-h-12 rounded-lg"
        />
        {errorKey ? (
          <p role="alert" className="animate-rise-in text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
          <Button variant="ghost" className="rounded-full" onClick={() => goTo(1)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('finalize.owner.back')}
          </Button>
          <Button type="submit" className="min-h-12 w-full rounded-full px-6 sm:w-auto">
            {t('finalize.owner.continue')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </form>
      <OwnerAside />
    </div>
  )
}
