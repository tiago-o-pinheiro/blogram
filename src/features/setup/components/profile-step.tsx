'use client'

import { ArrowRight, Camera, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Card } from '@/design-system/ui/card'
import { Field } from '@/design-system/ui/field'
import { Input } from '@/design-system/ui/input'
import { Textarea } from '@/design-system/ui/textarea'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import {
  isProfileBundle,
  PROFILE_DESCRIPTION_MAX,
  PROFILE_NAME_MAX,
  PROFILE_PHOTO_PATH,
} from '@/models/models'

import { ProfilePreview } from './profile-preview'
import { useSetupWizardActions, useSetupWizardState } from './setup-wizard-context'
import { SetupApiError, saveSetupProfile, uploadSetupPhoto } from '../api/setup-api'
import { toSetupMessageKey } from '../lib/to-setup-message'

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BYTES_PER_MEGABYTE = 1048576

export const ProfileStep = ({ maxPhotoBytes = 10485760 }: { maxPhotoBytes?: number }) => {
  const t = useT()
  const { profile, photoPreviewUrl } = useSetupWizardState()
  const { setProfile, setPhotoPreviewUrl, goTo } = useSetupWizardActions()
  const [name, setName] = useState(profile?.name ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)
  const objectUrlRef = useRef<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

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
      return
    }
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      event.target.value = ''
      setErrorKey('wizard.profile.error.photoType')
      return
    }
    if (file.size > maxPhotoBytes) {
      event.target.value = ''
      setErrorKey('errors.setup.tooLarge')
      return
    }
    setErrorKey(null)
    setPhotoFile(file)
    replaceObjectUrl(URL.createObjectURL(file))
  }

  const bundle = { name: name.trim(), description: description.trim() }
  const isNameMissing = bundle.name.length === 0
  const photoSrc = photoPreviewUrl ?? (profile?.hasPhoto ? PROFILE_PHOTO_PATH : null)
  const maxPhotoMegabytes = Math.max(1, Math.floor(maxPhotoBytes / BYTES_PER_MEGABYTE))

  const handleUndoPhoto = () => {
    setPhotoFile(null)
    replaceObjectUrl(null)
    setErrorKey(null)
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

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
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card className="rounded-xl border-border/20 bg-surface/60 p-4 shadow-none sm:p-5">
          <div className="flex items-start gap-4">
            {photoSrc ? (
              <Image
                src={photoSrc}
                alt=""
                width={72}
                height={72}
                unoptimized
                className="size-16 shrink-0 rounded-full object-cover sm:size-18"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground sm:size-18"
              >
                <Camera className="size-6" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-sm font-medium">{t('wizard.profile.photo')}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('wizard.profile.photoHint', { max: maxPhotoMegabytes })}
              </p>
              <Input
                ref={photoInputRef}
                className="hidden"
                tabIndex={-1}
                aria-label={t('wizard.profile.photo')}
                name="photo"
                type="file"
                accept={ACCEPTED_PHOTO_TYPES.join(',')}
                disabled={isPending}
                onChange={handlePhotoChange}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="rounded-full border border-input"
                  disabled={isPending}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="size-4" aria-hidden="true" />
                  {t(photoSrc ? 'wizard.profile.changePhoto' : 'wizard.profile.choosePhoto')}
                </Button>
                {photoFile ? (
                  <Button
                    variant="ghost"
                    className="rounded-full"
                    disabled={isPending}
                    onClick={handleUndoPhoto}
                  >
                    <X className="size-4" aria-hidden="true" />
                    {t('wizard.profile.undoPhoto')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {photoFile ? (
            <p role="status" className="text-xs break-all text-muted-foreground">
              {t('wizard.profile.selectedPhoto', { name: photoFile.name })}
            </p>
          ) : null}
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
