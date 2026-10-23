'use client'

import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Select } from '@/design-system/ui/select'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import { LOCALES, type SiteSettings } from '@/models/models'

import { toPostsMessageKey } from '@/features/posts/lib/to-posts-message'

import { saveSettings, SettingsApiError } from '../api/settings-api'

type LanguageFormProps = {
  settings: SiteSettings
}

export const LanguageForm = ({ settings }: LanguageFormProps) => {
  const t = useT()
  const router = useRouter()
  const [defaultLocale, setDefaultLocale] = useState(settings.defaultLocale)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = LOCALES.find((locale) => locale === event.target.value)
    if (!next) {
      return
    }
    setIsSaved(false)
    setDefaultLocale(next)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorKey(null)
    setIsSaved(false)
    setIsPending(true)
    try {
      await saveSettings({ defaultLocale })
    } catch (error) {
      setIsPending(false)
      setErrorKey(
        error instanceof SettingsApiError ? toPostsMessageKey(error.status) : 'posts.error.generic',
      )
      return
    }
    setIsPending(false)
    setIsSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Select
        label={t('languageForm.label')}
        name="defaultLocale"
        value={defaultLocale}
        disabled={isPending}
        onChange={handleChange}
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {t(`languageForm.${locale}`)}
          </option>
        ))}
      </Select>
      <p className="text-sm text-muted-foreground">{t('languageForm.hint')}</p>
      {errorKey ? (
        <p role="alert" className="text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      {isSaved ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('languageForm.saved')}
        </p>
      ) : null}
      <Button type="submit" isLoading={isPending} loadingLabel={t('languageForm.saving')}>
        {t('languageForm.save')}
      </Button>
    </form>
  )
}
