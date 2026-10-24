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
    <header className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-8 text-center stagger">
      {photoSrc ? (
        <Image
          src={photoSrc}
          alt={t('home.profile.photoAlt', { name })}
          width={128}
          height={128}
          unoptimized
          className="size-24 animate-scale-in rounded-full object-cover ring-4 ring-surface sm:size-28"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-24 animate-scale-in items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground sm:size-28"
        >
          {name.trim().charAt(0).toUpperCase()}
        </div>
      )}
      <Heading className="animate-rise-in text-3xl font-semibold tracking-tight break-words sm:text-4xl">
        {name}
      </Heading>
      {description ? (
        <p className="max-w-lg animate-rise-in text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </header>
  )
}
