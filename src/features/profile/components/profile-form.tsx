'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { type MediaSelection } from '@/design-system/ui/media-input'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import {
  isProfileBundle,
  PROFILE_DESCRIPTION_MAX,
  PROFILE_NAME_MAX,
  PROFILE_PHOTO_PATH,
  type Profile,
} from '@/models/models'

import { MediaField } from '@/components/media-field'
import { ProfileHeader } from '@/features/home/components/profile-header'
import { toPostsMessageKey } from '@/features/posts/lib/to-posts-message'

import { ProfileApiError, saveProfile, uploadProfilePhoto } from '../api/profile-api'

type ProfileFormProps = {
  profile: Profile
  maxPhotoBytes: number
}

export const ProfileForm = ({ profile, maxPhotoBytes }: ProfileFormProps) => {
  const t = useT()
  const router = useRouter()
  const [name, setName] = useState(profile.name)
  const [description, setDescription] = useState(profile.description)
  const [photo, setPhoto] = useState<MediaSelection | null>(null)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [hasPhoto, setHasPhoto] = useState(profile.hasPhoto)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handlePhotoChange = (selection: MediaSelection | null) => {
    setErrorKey(null)
    setIsSaved(false)
    setPhoto(selection)
  }

  const bundle = { name: name.trim(), description: description.trim() }
  const isNameMissing = bundle.name.length === 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isProfileBundle(bundle)) {
      setErrorKey('posts.error.invalid')
      return
    }
    setErrorKey(null)
    setIsSaved(false)
    setIsPending(true)
    try {
      await saveProfile(bundle)
      if (photo) {
        setHasPhoto((await uploadProfilePhoto(photo.file)).hasPhoto)
        setPhotoVersion((version) => version + 1)
        setPhoto(null)
      }
    } catch (error) {
      setIsPending(false)
      setErrorKey(
        error instanceof ProfileApiError ? toPostsMessageKey(error.status) : 'posts.error.generic',
      )
      return
    }
    setIsPending(false)
    setIsSaved(true)
    router.refresh()
  }

  const savedPhotoSrc = hasPhoto ? `${PROFILE_PHOTO_PATH}?v=${photoVersion}` : null

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <Field
          label={t('profileAdmin.name')}
          name="name"
          value={name}
          maxLength={PROFILE_NAME_MAX}
          disabled={isPending}
          required
          autoComplete="off"
          onChange={(event) => {
            setIsSaved(false)
            setName(event.target.value)
          }}
        />
        <Field
          label={t('profileAdmin.description')}
          name="description"
          value={description}
          maxLength={PROFILE_DESCRIPTION_MAX}
          disabled={isPending}
          autoComplete="off"
          onChange={(event) => {
            setIsSaved(false)
            setDescription(event.target.value)
          }}
        />
        <MediaField
          label={t('profileAdmin.photo')}
          name="photo"
          kind="photo"
          layout="avatar"
          maxBytes={maxPhotoBytes}
          value={photo}
          savedSrc={savedPhotoSrc}
          isDisabled={isPending}
          onChange={handlePhotoChange}
        />
        {errorKey ? (
          <p role="alert" className="animate-rise-in text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}
        {isSaved ? (
          <p role="status" className="animate-rise-in text-sm text-muted-foreground">
            {t('profileAdmin.saved')}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={isNameMissing}
          isLoading={isPending}
          loadingLabel={t('profileAdmin.saving')}
        >
          {t('profileAdmin.save')}
        </Button>
      </form>
      <section
        aria-label={t('profileAdmin.previewLabel')}
        className="rounded-md border border-input p-4"
      >
        <ProfileHeader
          as="h2"
          name={name || t('profileAdmin.namePlaceholder')}
          description={description}
          photoSrc={photo?.previewUrl ?? savedPhotoSrc}
        />
      </section>
    </div>
  )
}
