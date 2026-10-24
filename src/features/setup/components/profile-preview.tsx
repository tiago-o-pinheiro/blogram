'use client'

import { ImagePlus } from 'lucide-react'
import Image from 'next/image'

import { Card } from '@/design-system/ui/card'
import { useT } from '@/i18n/i18n-context'

type ProfilePreviewProps = { name: string; description: string; photoSrc: string | null }

export const ProfilePreview = ({ name, description, photoSrc }: ProfilePreviewProps) => {
  const t = useT()
  const displayName = name.trim() || t('wizard.profile.namePlaceholder')

  return (
    <Card
      role="region"
      aria-label={t('wizard.profile.previewLabel')}
      className="gap-0 overflow-hidden rounded-xl border-line bg-surface-soft p-0 shadow-none"
    >
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          {t('wizard.profile.livePreview')}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center px-6 py-8 text-center sm:py-10">
        {photoSrc ? (
          <Image
            key={photoSrc}
            src={photoSrc}
            unoptimized
            width={96}
            height={96}
            alt={t('home.profile.photoAlt', { name: displayName })}
            className="size-24 animate-scale-in rounded-full object-cover ring-4 ring-background"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-24 items-center justify-center rounded-full bg-accent text-3xl font-medium text-accent-foreground ring-4 ring-background"
          >
            <span key={displayName.slice(0, 1).toUpperCase()} className="animate-scale-in">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <h2 className="mt-5 w-full text-2xl font-semibold tracking-tight break-words">
          {displayName}
        </h2>
        <p className="mt-2 w-full text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
          {description || t('wizard.profile.descriptionPreview')}
        </p>
        <div className="mt-8 flex w-full flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-soft px-5 py-6 text-muted-foreground">
          <ImagePlus className="size-5" aria-hidden="true" />
          <p className="max-w-48 text-xs leading-relaxed">{t('wizard.profile.feedPreview')}</p>
        </div>
      </div>
    </Card>
  )
}
