'use client'

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import {
  isProfileBundle,
  PROFILE_DESCRIPTION_MAX,
  PROFILE_NAME_MAX,
  PROFILE_PHOTO_PATH,
} from '@/models/models'

import { ProfileHeader } from '@/features/home/components/profile-header'

import { useSetupWizardActions, useSetupWizardState } from './setup-wizard-context'
import { SetupApiError, saveSetupProfile, uploadSetupPhoto } from '../api/setup-api'
import { toSetupMessageKey } from '../lib/to-setup-message'

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const ProfileStep = () => {
  const t = useT()
  const { profile, photoPreviewUrl } = useSetupWizardState()
  const { setProfile, setPhotoPreviewUrl, goTo } = useSetupWizardActions()
  const [name, setName] = useState(profile?.name ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
        setPhotoPreviewUrl(null)
      }
    },
    [setPhotoPreviewUrl],
  )

  const replaceObjectUrl = (nextUrl: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    objectUrlRef.current = nextUrl
    setPhotoPreviewUrl(nextUrl)
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setPhotoFile(null)
      replaceObjectUrl(null)
      return
    }
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      event.target.value = ''
      setPhotoFile(null)
      replaceObjectUrl(null)
      setErrorKey('wizard.profile.error.photoType')
      return
    }
    setErrorKey(null)
    setPhotoFile(file)
    replaceObjectUrl(URL.createObjectURL(file))
  }

  const bundle = { name: name.trim(), description: description.trim() }
  const isNameMissing = bundle.name.length === 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isProfileBundle(bundle)) {
      setErrorKey('errors.setup.invalid')
      return
    }
    setErrorKey(null)
    setIsPending(true)
    try {
      const saved = await saveSetupProfile(bundle)
      setProfile(photoFile ? await uploadSetupPhoto(photoFile) : saved)
    } catch (error) {
      setIsPending(false)
      setErrorKey(
        error instanceof SetupApiError ? toSetupMessageKey(error.status) : 'errors.setup.generic',
      )
      return
    }
    setIsPending(false)
    goTo(2)
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <Field
          label={t('wizard.profile.name')}
          name="name"
          value={name}
          maxLength={PROFILE_NAME_MAX}
          disabled={isPending}
          required
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
        <Field
          label={t('wizard.profile.description')}
          name="description"
          value={description}
          maxLength={PROFILE_DESCRIPTION_MAX}
          disabled={isPending}
          autoComplete="off"
          onChange={(event) => setDescription(event.target.value)}
        />
        <Field
          label={t('wizard.profile.photo')}
          name="photo"
          type="file"
          accept={ACCEPTED_PHOTO_TYPES.join(',')}
          disabled={isPending}
          onChange={handlePhotoChange}
        />
        {errorKey ? (
          <p role="alert" className="text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={isNameMissing}
          isLoading={isPending}
          loadingLabel={t('wizard.profile.saving')}
        >
          {t('wizard.profile.continue')}
        </Button>
      </form>
      <section
        aria-label={t('wizard.profile.previewLabel')}
        className="rounded-md border border-input"
      >
        <ProfileHeader
          as="h2"
          name={name || t('wizard.profile.namePlaceholder')}
          description={description}
          photoSrc={photoPreviewUrl ?? (profile?.hasPhoto ? PROFILE_PHOTO_PATH : null)}
        />
      </section>
    </div>
  )
}
