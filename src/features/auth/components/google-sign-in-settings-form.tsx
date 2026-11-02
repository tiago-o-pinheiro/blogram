'use client'

import { FileJson } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, type ClipboardEvent, type FormEvent, useState } from 'react'

import { Button, buttonVariants } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { cn } from '@/design-system/ui/lib/cn'
import { Switch } from '@/design-system/ui/switch'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import {
  GOOGLE_CLIENT_ID_MAX,
  GOOGLE_CLIENT_SECRET_MAX,
  type GoogleSignInSettings,
  isGoogleWebClientId,
} from '@/models/models'

import { PasswordField } from '@/components/password-field'

import { GoogleSettingsApiError, saveGoogleSettings } from '../api/google-settings-api'
import { readGoogleClientJson } from '../lib/read-google-client-json'

type GoogleSignInSettingsFormProps = {
  settings: GoogleSignInSettings
}

type Notice = { key: TranslationKey; isError: boolean }

const toSettingsErrorKey = (error: unknown): TranslationKey => {
  if (!(error instanceof GoogleSettingsApiError)) {
    return 'google.settings.errors.generic'
  }
  if (error.status === 409) {
    return 'google.settings.errors.managed'
  }
  if (error.reason === 'google-invalid-client') {
    return 'google.settings.errors.invalidClient'
  }
  return error.status === 422 ? 'google.settings.errors.invalid' : 'google.settings.errors.generic'
}

export const GoogleSignInSettingsForm = ({ settings }: GoogleSignInSettingsFormProps) => {
  const t = useT()
  const router = useRouter()
  const isFresh = settings.clientId === '' && !settings.hasClientSecret
  const [saved, setSaved] = useState(settings)
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled || isFresh)
  const [clientId, setClientId] = useState(settings.clientId)
  const [clientSecret, setClientSecret] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const isManagedByEnv = settings.source === 'env'
  const trimmedClientId = clientId.trim()
  const isClientIdInvalid = trimmedClientId !== '' && !isGoogleWebClientId(trimmedClientId)

  const applyJson = (text: string): boolean => {
    const client = readGoogleClientJson(text)
    if (!client) {
      return false
    }
    setIsSaved(false)
    setErrorKey(null)
    if (client.kind === 'other') {
      setNotice({ key: 'google.settings.importWrongType', isError: true })
      return true
    }
    setClientId(client.clientId)
    setClientSecret(client.clientSecret)
    setIsEnabled(true)
    const isRedirectListed =
      client.redirectUris.length === 0 || client.redirectUris.includes(settings.redirectUri)
    setNotice(
      isRedirectListed
        ? { key: 'google.settings.imported', isError: false }
        : { key: 'google.settings.redirectMissing', isError: true },
    )
    return true
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) {
      return
    }
    const text = await file.text().catch(() => '')
    if (!applyJson(text)) {
      setNotice({ key: 'google.settings.importInvalid', isError: true })
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (applyJson(event.clipboardData.getData('text'))) {
      event.preventDefault()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorKey(null)
    setNotice(null)
    setIsSaved(false)
    setIsPending(true)
    const trimmedSecret = clientSecret.trim()
    try {
      const next = await saveGoogleSettings({
        isEnabled,
        clientId: trimmedClientId,
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

  if (isManagedByEnv) {
    return (
      <div className="flex animate-rise-in flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t('google.settings.managedByEnv')}</p>
        <Switch
          label={t('google.settings.enable')}
          description={t('google.settings.enableHint')}
          checked={settings.isEnabled}
          disabled
          onCheckedChange={() => undefined}
        />
        <Field
          label={t('google.settings.clientId')}
          name="clientId"
          value={settings.clientId}
          readOnly
        />
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('google.settings.hint')}</p>
      <div className="flex flex-col gap-2">
        <label
          className={cn(
            buttonVariants({ variant: 'secondary' }),
            'cursor-pointer self-start transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
            isPending && 'pointer-events-none opacity-disabled',
          )}
        >
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={isPending}
            onChange={(event) => void handleFile(event)}
          />
          <FileJson aria-hidden="true" className="size-4" />
          {t('google.settings.import')}
        </label>
        {notice ? (
          <p
            key={notice.key}
            role={notice.isError ? 'alert' : 'status'}
            className={`animate-rise-in text-sm ${notice.isError ? 'text-danger' : 'text-muted-foreground'}`}
          >
            {t(notice.key)}
          </p>
        ) : null}
      </div>
      <Field
        label={t('google.settings.clientId')}
        name="clientId"
        value={clientId}
        maxLength={GOOGLE_CLIENT_ID_MAX}
        disabled={isPending}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="1234-abcd.apps.googleusercontent.com"
        error={isClientIdInvalid ? t('google.settings.clientIdInvalid') : undefined}
        onPaste={handlePaste}
        onChange={(event) => {
          setIsSaved(false)
          setClientId(event.target.value)
        }}
      />
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
      <Switch
        label={t('google.settings.enable')}
        description={t('google.settings.enableHint')}
        checked={isEnabled}
        disabled={isPending}
        onCheckedChange={(checked) => {
          setIsSaved(false)
          setIsEnabled(checked)
        }}
      />
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
      <Button
        type="submit"
        disabled={isClientIdInvalid}
        isLoading={isPending}
        loadingLabel={t('google.settings.saving')}
      >
        {t('google.settings.save')}
      </Button>
    </form>
  )
}
