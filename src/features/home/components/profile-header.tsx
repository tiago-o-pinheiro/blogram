'use client'

import Image from 'next/image'

import { useT } from '@/i18n/i18n-context'

type ProfileHeaderProps = {
  name: string
  description: string
  photoSrc: string | null
  as?: 'h1' | 'h2'
}

export const ProfileHeader = ({
  name,
  description,
  photoSrc,
  as: Heading = 'h1',
}: ProfileHeaderProps) => {
  const t = useT()

  return (
    <header className="mx-auto flex w-full max-w-2xl items-center gap-4 sm:gap-6">
      {photoSrc ? (
        <Image
          src={photoSrc}
          alt={t('home.profile.photoAlt', { name })}
          width={128}
          height={128}
          loading="eager"
          unoptimized
          className="size-20 shrink-0 animate-scale-in rounded-full object-cover shadow-sm ring-1 ring-line sm:size-24"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-20 shrink-0 animate-scale-in items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground sm:size-24"
        >
          {name.trim().charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1 stagger">
        <Heading className="animate-rise-in text-2xl leading-tight font-semibold tracking-tight break-words sm:text-3xl">
          {name}
        </Heading>
        {description ? (
          <p className="animate-rise-in text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  )
}
