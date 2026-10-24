'use client'

import { MapPin, ExternalLink, X } from 'lucide-react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { useT } from '@/i18n/i18n-context'
import { Models } from '@/models'

type PlaceFieldsProps = {
  value: Models.PostPlace | null
  onChange: (place: Models.PostPlace | null) => void
  isDisabled: boolean
}

export const PlaceFields = ({ value, onChange, isDisabled }: PlaceFieldsProps) => {
  const t = useT()
  return (
    <fieldset
      disabled={isDisabled}
      className="flex min-w-0 flex-col gap-3 border-t border-border/20 pt-4"
    >
      <legend className="sr-only">{t('postForm.place')}</legend>
      <div className="flex items-center justify-between gap-3">
        <div aria-hidden="true" className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{t('postForm.place')}</span>
          <span className="text-xs text-muted-foreground">{t('postForm.placeSummary')}</span>
        </div>
        {value === null ? (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={isDisabled}
            onClick={() => onChange({ name: '' })}
          >
            <MapPin aria-hidden="true" className="size-4" />
            {t('postForm.addPlace')}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            disabled={isDisabled}
            onClick={() => onChange(null)}
          >
            <X aria-hidden="true" className="size-4" />
            {t('postForm.removePlace')}
          </Button>
        )}
      </div>
      {value === null ? null : (
        <>
          <Field
            label={t('postForm.placeName')}
            name="placeName"
            value={value.name}
            maxLength={Models.PLACE_NAME_MAX}
            required
            pattern=".*\S.*"
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">{t('postForm.placeHint')}</p>
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(value.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('postForm.findPlace')}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
          <Field
            label={t('postForm.placeMapUrl')}
            name="placeMapUrl"
            type="url"
            value={value.mapUrl ?? ''}
            maxLength={2048}
            pattern={Models.PLACE_MAP_URL_PATTERN}
            onChange={(event) =>
              onChange({
                name: value.name,
                ...(event.target.value ? { mapUrl: event.target.value } : {}),
              })
            }
          />
        </>
      )}
    </fieldset>
  )
}
