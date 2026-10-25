'use client'

import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useId, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { Select } from '@/design-system/ui/select'
import { Switch } from '@/design-system/ui/switch'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import {
  AI_API_KEY_MAX,
  AI_MODEL_MAX,
  AI_MODEL_SUGGESTIONS,
  AI_PROVIDERS,
  type AiSettings,
} from '@/models/models'

import { PasswordField } from '@/components/password-field'

import { AiApiError, saveAiSettings } from '../api/ai-api'

type AiSettingsFormProps = {
  settings: AiSettings
}

const toSettingsErrorKey = (error: unknown): TranslationKey =>
  error instanceof AiApiError && error.status === 422
    ? 'aiSettings.errors.invalid'
    : 'aiSettings.errors.generic'

export const AiSettingsForm = ({ settings }: AiSettingsFormProps) => {
  const t = useT()
  const router = useRouter()
  const suggestionsId = useId()
  const [saved, setSaved] = useState(settings)
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled)
  const [provider, setProvider] = useState(settings.provider)
  const [model, setModel] = useState(settings.model)
  const [apiKey, setApiKey] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const hasSavedKey = saved.hasApiKey && saved.provider === provider

  const handleProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = AI_PROVIDERS.find((candidate) => candidate === event.target.value)
    if (!next) {
      return
    }
    setIsSaved(false)
    setProvider(next)
    setModel(AI_MODEL_SUGGESTIONS[next][0] ?? '')
    setApiKey('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorKey(null)
    setIsSaved(false)
    setIsPending(true)
    try {
      const next = await saveAiSettings({
        isEnabled,
        provider,
        model: model.trim(),
        ...(apiKey === '' ? {} : { apiKey }),
      })
      setSaved(next)
      setApiKey('')
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
      <p className="text-sm text-muted-foreground">{t('aiSettings.hint')}</p>
      <Switch
        label={t('aiSettings.enable')}
        description={t('aiSettings.enableHint')}
        checked={isEnabled}
        disabled={isPending}
        onCheckedChange={(checked) => {
          setIsSaved(false)
          setIsEnabled(checked)
        }}
      />
      {isEnabled ? (
        <div className="flex animate-rise-in flex-col gap-4">
          <Select
            label={t('aiSettings.provider')}
            name="provider"
            value={provider}
            disabled={isPending}
            onChange={handleProviderChange}
          >
            {AI_PROVIDERS.map((candidate) => (
              <option key={candidate} value={candidate}>
                {t(`aiSettings.providers.${candidate}`)}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-1.5">
            <Field
              label={t('aiSettings.model')}
              name="model"
              value={model}
              list={suggestionsId}
              maxLength={AI_MODEL_MAX}
              disabled={isPending}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setIsSaved(false)
                setModel(event.target.value)
              }}
            />
            <datalist id={suggestionsId}>
              {AI_MODEL_SUGGESTIONS[provider].map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('aiSettings.modelHint')}
            </p>
          </div>
          <PasswordField
            label={t('aiSettings.apiKey')}
            name="apiKey"
            value={apiKey}
            maxLength={AI_API_KEY_MAX}
            disabled={isPending}
            autoComplete="off"
            hint={
              hasSavedKey
                ? `${t('aiSettings.apiKeySaved', { hint: saved.apiKeyHint })}. ${t('aiSettings.apiKeyKeep')}`
                : undefined
            }
            onChange={(event) => {
              setIsSaved(false)
              setApiKey(event.target.value)
            }}
          />
        </div>
      ) : null}
      {errorKey ? (
        <p key={errorKey} role="alert" className="animate-rise-in text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      {isSaved ? (
        <p role="status" className="animate-rise-in text-sm text-muted-foreground">
          {t('aiSettings.saved')}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel={t('aiSettings.saving')}>
        {t('aiSettings.save')}
      </Button>
    </form>
  )
}
