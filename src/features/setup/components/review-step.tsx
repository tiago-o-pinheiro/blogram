'use client'

import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Card } from '@/design-system/ui/card'
import { useT } from '@/i18n/i18n-context'
import { PROFILE_PHOTO_PATH } from '@/models/models'

import { ProfilePreview } from './profile-preview'
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
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="flex flex-col gap-4">
        {profile ? (
          <ProfilePreview
            name={profile.name}
            description={profile.description}
            photoSrc={photoPreviewUrl ?? (profile.hasPhoto ? PROFILE_PHOTO_PATH : null)}
          />
        ) : (
          <p role="alert" className="text-sm text-danger">
            {t('finalize.review.missingProfile')}
          </p>
        )}
        <Button
          variant="ghost"
          className="w-full rounded-full"
          disabled={isPending}
          onClick={() => goTo(1)}
        >
          <Pencil className="size-4" aria-hidden="true" />
          {t('wizard.review.editProfile')}
        </Button>
      </div>
      <div className="flex flex-col gap-6">
        <Card className="gap-5 rounded-xl border-border/20 p-6 shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="text-xs font-medium text-muted-foreground">
                {t('finalize.review.ownerLabel')}
              </h2>
              <p className="font-medium break-all">{owner.identifier}</p>
            </div>
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={isPending}
              onClick={() => goTo(2)}
            >
              <Pencil className="size-4" aria-hidden="true" />
              {t('wizard.review.editAccount')}
            </Button>
          </div>
          <p className="flex items-center gap-2 border-t border-border/20 pt-4 text-sm text-muted-foreground">
            <Check className="size-4 text-primary" aria-hidden="true" />
            {t('wizard.review.passwordSet')}
          </p>
        </Card>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('wizard.review.readyHint')}
        </p>
        {errorMessage ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 border-t border-border/20 pt-6 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            className="rounded-full"
            disabled={isPending}
            onClick={() => goTo(2)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('finalize.review.back')}
          </Button>
          <Button
            isLoading={isPending}
            disabled={!profile}
            loadingLabel={t('finalize.review.finishing')}
            onClick={() => void handleFinish()}
            className="min-h-12 w-full rounded-full px-6 sm:w-auto"
          >
            {t('finalize.review.finish')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
