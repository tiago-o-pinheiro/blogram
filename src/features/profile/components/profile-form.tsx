'use client'

import { useRouter } from 'next/navigation'
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
  type Profile,
} from '@/models/models'

import { ProfileHeader } from '@/features/home/components/profile-header'
import { toPostsMessageKey } from '@/features/posts/lib/to-posts-message'

import { ProfileApiError, saveProfile, uploadProfilePhoto } from '../api/profile-api'

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 10 * 1024 * 1024

type ProfileFormProps = {
  profile: Profile
}

export const ProfileForm = ({ profile }: ProfileFormProps) => {
  const t = useT()
  const router = useRouter()
  const [name, setName] = useState(profile.name)
  const [description, setDescription] = useState(profile.description)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [hasPhoto, setHasPhoto] = useState(profile.hasPhoto)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    },
    [],
  )

  const replaceObjectUrl = (nextUrl: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    objectUrlRef.current = nextUrl
    setPhotoPreviewUrl(nextUrl)
  }

  const rejectPhoto = (input: HTMLInputElement, key: TranslationKey) => {
    input.value = ''
    setPhotoFile(null)
    replaceObjectUrl(null)
    setErrorKey(key)
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setIsSaved(false)
    if (!file) {
      setPhotoFile(null)
      replaceObjectUrl(null)
      return
    }
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      rejectPhoto(event.target, 'profileAdmin.error.photoType')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      rejectPhoto(event.target, 'profileAdmin.error.photoSize')
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
      setErrorKey('posts.error.invalid')
      return
    }
    setErrorKey(null)
    setIsSaved(false)
    setIsPending(true)
    try {
      await saveProfile(bundle)
      if (photoFile) {
        const updated = await uploadProfilePhoto(photoFile)
        setHasPhoto(updated.hasPhoto)
        setPhotoVersion((version) => version + 1)
        setPhotoFile(null)
        replaceObjectUrl(null)
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
        <Field
          label={t('profileAdmin.photo')}
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
        {isSaved ? (
          <p role="status" className="text-sm text-muted-foreground">
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
        className="rounded-md border border-input"
      >
        <ProfileHeader
          as="h2"
          name={name || t('profileAdmin.namePlaceholder')}
          description={description}
          photoSrc={photoPreviewUrl ?? savedPhotoSrc}
        />
      </section>
    </div>
  )
}
