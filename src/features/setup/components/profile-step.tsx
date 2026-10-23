'use client'

import { ArrowRight } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Card } from '@/design-system/ui/card'
import { Field } from '@/design-system/ui/field'
import { type MediaSelection } from '@/design-system/ui/media-input'
import { Textarea } from '@/design-system/ui/textarea'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import {
  DEFAULT_UPLOAD_MAX_IMAGE_BYTES,
  isProfileBundle,
  PROFILE_DESCRIPTION_MAX,
  PROFILE_NAME_MAX,
  PROFILE_PHOTO_PATH,
} from '@/models/models'

import { MediaField } from '@/components/media-field'

import { ProfilePreview } from './profile-preview'
import { useSetupWizardActions, useSetupWizardState } from './setup-wizard-context'
import { SetupApiError, saveSetupProfile, uploadSetupPhoto } from '../api/setup-api'
import { toSetupMessageKey } from '../lib/to-setup-message'

export const ProfileStep = ({
  maxPhotoBytes = DEFAULT_UPLOAD_MAX_IMAGE_BYTES,
}: {
  maxPhotoBytes?: number
}) => {
  const t = useT()
  const { profile, photoPreviewUrl } = useSetupWizardState()
  const { setProfile, setPhotoPreviewUrl, goTo } = useSetupWizardActions()
  const [name, setName] = useState(profile?.name ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [photo, setPhoto] = useState<MediaSelection | null>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => () => setPhotoPreviewUrl(null), [setPhotoPreviewUrl])

  const handlePhotoChange = (selection: MediaSelection | null) => {
    setErrorKey(null)
    setPhoto(selection)
    setPhotoPreviewUrl(selection?.previewUrl ?? null)
  }

  const bundle = { name: name.trim(), description: description.trim() }
  const isNameMissing = bundle.name.length === 0
  const savedPhotoSrc = profile?.hasPhoto ? PROFILE_PHOTO_PATH : null
  const photoSrc = photoPreviewUrl ?? savedPhotoSrc

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
      setProfile(photo ? await uploadSetupPhoto(photo.file) : saved)
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
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card className="rounded-xl border-border/20 bg-surface/60 p-4 shadow-none sm:p-5">
          <MediaField
            name="photo"
            label={t('wizard.profile.photo')}
            kind="photo"
            layout="avatar"
            maxBytes={maxPhotoBytes}
            value={photo}
            savedSrc={savedPhotoSrc}
            alt=""
            isDisabled={isPending}
            onChange={handlePhotoChange}
          />
        </Card>
        <Field
          label={t('wizard.profile.name')}
          name="name"
          value={name}
          maxLength={PROFILE_NAME_MAX}
          disabled={isPending}
          required
          autoComplete="off"
          placeholder={t('wizard.profile.nameInputPlaceholder')}
          className="min-h-12 rounded-lg px-4"
          onChange={(event) => setName(event.target.value)}
        />
        <Textarea
          label={t('wizard.profile.description')}
          name="description"
          value={description}
          maxLength={PROFILE_DESCRIPTION_MAX}
          disabled={isPending}
          placeholder={t('wizard.profile.descriptionPlaceholder')}
          className="min-h-28 resize-y rounded-lg p-4"
          onChange={(event) => setDescription(event.target.value)}
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
          className="mt-1 min-h-12 w-full rounded-full"
        >
          {t('wizard.profile.continue')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>
      <div className="space-y-4">
        <ProfilePreview name={name} description={description} photoSrc={photoSrc} />
        <p className="px-4 text-center text-xs leading-relaxed text-muted-foreground">
          {t('wizard.profile.previewHint')}
        </p>
      </div>
    </div>
  )
}
