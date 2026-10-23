'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'
import { PROFILE_PHOTO_PATH } from '@/models/models'

import { ProfileHeader } from '@/features/home/components/profile-header'

import { useSetupWizardActions, useSetupWizardState } from './setup-wizard-context'
import { finalizeSetup, SetupApiError } from '../api/setup-api'
import { toSetupMessageKey } from '../lib/to-setup-message'

export const ReviewStep = () => {
  const t = useT()
  const router = useRouter()
  const { profile, photoPreviewUrl, owner } = useSetupWizardState()
  const { goTo } = useSetupWizardActions()
  const [errorMessage, setErrorMessage] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleFinish = async () => {
    setErrorMessage('')
    setIsPending(true)
    try {
      const { redirectTo } = await finalizeSetup(owner)
      router.replace(redirectTo)
      router.refresh()
    } catch (error) {
      setErrorMessage(t(toSetupMessageKey(error instanceof SetupApiError ? error.status : 0)))
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('finalize.review.title')}</h2>
      {profile ? (
        <section aria-label={t('finalize.review.previewLabel')}>
          <ProfileHeader
            as="h2"
            name={profile.name}
            description={profile.description}
            photoSrc={photoPreviewUrl ?? (profile.hasPhoto ? PROFILE_PHOTO_PATH : null)}
          />
        </section>
      ) : (
        <p role="alert" className="text-sm text-danger">
          {t('finalize.review.missingProfile')}
        </p>
      )}
      <p>
        <span className="font-medium">{t('finalize.review.ownerLabel')}: </span>
        {owner.identifier}
      </p>
      {errorMessage ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex justify-between gap-4">
        <Button variant="secondary" disabled={isPending} onClick={() => goTo(2)}>
          {t('finalize.review.back')}
        </Button>
        <Button
          isLoading={isPending}
          disabled={!profile}
          loadingLabel={t('finalize.review.finishing')}
          onClick={() => void handleFinish()}
        >
          {t('finalize.review.finish')}
        </Button>
      </div>
    </div>
  )
}
