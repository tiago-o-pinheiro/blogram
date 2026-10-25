'use client'

import { MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { useT } from '@/i18n/i18n-context'
import { type Models } from '@/models'

const PlacesMap = dynamic(
  () => import('@/features/places/components/places-map').then((module) => module.PlacesMap),
  { ssr: false, loading: () => <div className="h-map w-full animate-pulse bg-muted" /> },
)

type PlacesViewProps = { pins: Models.PlacePin[] }

export const PlacesView = ({ pins }: PlacesViewProps) => {
  const t = useT()
  const [isMapVisible, setIsMapVisible] = useState(false)
  const hasCoordinates = pins.some((pin) => pin.coordinates)

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6" aria-labelledby="places-title">
      <header className="flex animate-rise-in flex-wrap items-center justify-between gap-3">
        <h1 id="places-title" className="text-2xl font-semibold">
          {t('places.title')}
        </h1>
        <Link
          href="/"
          className="inline-flex min-h-11 press items-center rounded-full border border-line-strong px-5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t('archive.back')}
        </Link>
      </header>
      {pins.length === 0 ? (
        <div className="animate-rise-in rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t('places.empty')}</p>
        </div>
      ) : (
        <>
          {hasCoordinates ? (
            <div className="animate-rise-in space-y-3">
              {isMapVisible ? (
                <div className="animate-fade-in space-y-2">
                  <p className="text-xs text-muted-foreground">{t('places.mapConsent')}</p>
                  <div className="overflow-hidden rounded-xl border border-line">
                    <PlacesMap pins={pins} />
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => setIsMapVisible(true)}
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  {t('places.showMap')}
                </Button>
              )}
            </div>
          ) : null}
          <ul aria-label={t('places.list')} className="space-y-4 stagger">
            {pins.map((pin) => (
              <li
                key={`${pin.name}-${pin.coordinates?.lat ?? ''}-${pin.coordinates?.lon ?? ''}`}
                className="animate-rise-in space-y-2 rounded-xl border border-line bg-card p-5"
              >
                <h2 className="text-lg font-medium">{pin.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('places.posts', { count: pin.posts.length })}
                </p>
                <ul className="space-y-1">
                  {pin.posts.map((summary) => (
                    <li key={summary.id}>
                      <Link
                        href={`/posts/${summary.id}`}
                        className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {summary.title || t(`feed.${summary.type}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
