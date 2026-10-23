'use client'

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
    <header className="flex flex-col items-center gap-4 p-6 text-center">
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt={t('home.profile.photoAlt', { name })}
          width={128}
          height={128}
          className="size-32 rounded-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-32 items-center justify-center rounded-full bg-muted text-4xl font-semibold text-muted-foreground"
        >
          {name.trim().charAt(0).toUpperCase()}
        </div>
      )}
      <Heading className="text-3xl font-semibold">{name}</Heading>
      {description ? <p className="text-muted-foreground">{description}</p> : null}
    </header>
  )
}
