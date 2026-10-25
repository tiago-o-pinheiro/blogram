'use client'

import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { Switch } from '@/design-system/ui/switch'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import {
  GOOGLE_CLIENT_ID_MAX,
  GOOGLE_CLIENT_SECRET_MAX,
  type GoogleSignInSettings,
} from '@/models/models'

import { PasswordField } from '@/components/password-field'

import { GoogleSettingsApiError, saveGoogleSettings } from '../api/google-settings-api'

type GoogleSignInSettingsFormProps = {
  settings: GoogleSignInSettings
}

const toSettingsErrorKey = (error: unknown): TranslationKey => {
  if (error instanceof GoogleSettingsApiError && error.status === 409) {
    return 'google.settings.errors.managed'
  }
  if (error instanceof GoogleSettingsApiError && error.status === 422) {
    return 'google.settings.errors.invalid'
  }
  return 'google.settings.errors.generic'
}

export const GoogleSignInSettingsForm = ({ settings }: GoogleSignInSettingsFormProps) => {
  const t = useT()
  const router = useRouter()
  const [saved, setSaved] = useState(settings)
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled)
  const [clientId, setClientId] = useState(settings.clientId)
  const [clientSecret, setClientSecret] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [copyKey, setCopyKey] = useState<TranslationKey | null>(null)

  const isManagedByEnv = settings.source === 'env'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(settings.redirectUri)
      setCopyKey('google.settings.copied')
    } catch {
      setCopyKey('google.settings.copyFailed')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorKey(null)
    setIsSaved(false)
    setIsPending(true)
    const trimmedSecret = clientSecret.trim()
    try {
      const next = await saveGoogleSettings({
        isEnabled,
        clientId: clientId.trim(),
        ...(trimmedSecret === '' ? {} : { clientSecret: trimmedSecret }),
      })
      setSaved(next)
      setClientSecret('')
    } catch (error) {
      setIsPending(false)
      setErrorKey(toSettingsErrorKey(error))
      return
    }
    setIsPending(false)
    setIsSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      {isManagedByEnv ? (
        <p className="animate-rise-in text-sm text-muted-foreground">
          {t('google.settings.managedByEnv')}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t('google.settings.hint')}</p>
      )}
      <Switch
        label={t('google.settings.enable')}
        description={t('google.settings.enableHint')}
        checked={isManagedByEnv ? settings.isEnabled : isEnabled}
        disabled={isManagedByEnv || isPending}
        onCheckedChange={(checked) => {
          setIsSaved(false)
          setIsEnabled(checked)
        }}
      />
      <Field
        label={t('google.settings.clientId')}
        name="clientId"
        value={isManagedByEnv ? settings.clientId : clientId}
        maxLength={GOOGLE_CLIENT_ID_MAX}
        readOnly={isManagedByEnv}
        disabled={isPending}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        onChange={(event) => {
          setIsSaved(false)
          setClientId(event.target.value)
        }}
      />
      {isManagedByEnv ? null : (
        <PasswordField
          label={t('google.settings.clientSecret')}
          name="clientSecret"
          value={clientSecret}
          maxLength={GOOGLE_CLIENT_SECRET_MAX}
          disabled={isPending}
          autoComplete="off"
          hint={saved.hasClientSecret ? t('google.settings.secretSaved') : undefined}
          onChange={(event) => {
            setIsSaved(false)
            setClientSecret(event.target.value)
          }}
        />
      )}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          {t('google.settings.redirectUri')}
        </span>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all text-foreground">
            {settings.redirectUri}
          </code>
          <Button
            variant="secondary"
            size="icon"
            aria-label={t('google.settings.copy')}
            onClick={() => void handleCopy()}
          >
            <Copy aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('google.settings.redirectHint')}
        </p>
        <p
          key={copyKey ?? 'idle'}
          role="status"
          className={copyKey ? 'animate-rise-in text-sm text-muted-foreground' : 'sr-only'}
        >
          {copyKey ? t(copyKey) : null}
        </p>
      </div>
      {errorKey ? (
        <p key={errorKey} role="alert" className="animate-rise-in text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      {isSaved ? (
        <p role="status" className="animate-rise-in text-sm text-muted-foreground">
          {t('google.settings.saved')}
        </p>
      ) : null}
      {isManagedByEnv ? null : (
        <Button type="submit" isLoading={isPending} loadingLabel={t('google.settings.saving')}>
          {t('google.settings.save')}
        </Button>
      )}
    </form>
  )
}
