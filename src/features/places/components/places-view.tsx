'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'

import { useT } from '@/i18n/i18n-context'
import { Models } from '@/models'

const PlacesMap = dynamic(
  () => import('@/features/places/components/places-map').then((module) => module.PlacesMap),
  { ssr: false, loading: () => <div className="h-map w-full animate-pulse bg-muted" /> },
)

type PlacesViewProps = { pins: Models.PlacePin[] }

export const PlacesView = ({ pins }: PlacesViewProps) => {
  const t = useT()

  return (
    <section
      className="mx-auto w-full max-w-2xl animate-fade-in space-y-6"
      aria-labelledby="places-title"
    >
      <header className="flex animate-rise-in flex-wrap items-center justify-between gap-3">
        <h1 id="places-title" className="text-2xl font-semibold">
          {t('places.title')}
        </h1>
        <Link
          href="/"
          className="inline-flex min-h-11 press animate-rise-in items-center rounded-full border border-line-strong px-5 text-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t('archive.back')}
        </Link>
      </header>
      <div className="animate-rise-in space-y-2">
        <div
          role="region"
          aria-label={t('places.map')}
          className="overflow-hidden rounded-xl border border-line"
        >
          <PlacesMap pins={pins} />
        </div>
        <p className="animate-fade-in text-xs text-muted-foreground">{t('places.mapConsent')}</p>
      </div>
      {pins.length === 0 ? (
        <div className="animate-rise-in rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t('places.empty')}</p>
        </div>
      ) : (
        <>
          <ul aria-label={t('places.list')} className="space-y-4 stagger">
            {pins.map((pin) => (
              <li
                key={pin.place}
                className="flex animate-rise-in items-center gap-4 rounded-xl border border-line bg-card p-5 transition"
              >
                {pin.cover?.image ? (
                  <Image
                    key={pin.cover.image.id}
                    src={Models.toPostImageHref(pin.cover.image, 480)}
                    width={pin.cover.image.width}
                    height={pin.cover.image.height}
                    alt=""
                    unoptimized
                    className="size-16 shrink-0 animate-fade-in rounded-lg object-cover transition"
                  />
                ) : pin.cover?.thumbnailUrl ? (
                  <Image
                    key={pin.cover.thumbnailUrl}
                    src={pin.cover.thumbnailUrl}
                    width={480}
                    height={360}
                    alt=""
                    unoptimized
                    className="size-16 shrink-0 animate-fade-in rounded-lg object-cover transition"
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="text-lg font-medium break-words">{pin.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t('places.posts', { count: pin.count })}
                  </p>
                </div>
                <Link
                  href={Models.toFeedHref('all', 1, { place: pin.place })}
                  className="inline-flex min-h-11 shrink-0 press animate-rise-in items-center rounded-full border border-line-strong px-4 text-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {t('places.goToPosts')}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
