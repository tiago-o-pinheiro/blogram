'use client'

import { MapPin, ExternalLink } from 'lucide-react'

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
    <fieldset disabled={isDisabled} className="min-w-0 rounded-xl border border-border/20 p-4">
      <legend className="px-2 text-sm font-medium">{t('postForm.place')}</legend>
      {value === null ? (
        <Button
          variant="ghost"
          type="button"
          disabled={isDisabled}
          onClick={() => onChange({ name: '' })}
        >
          <MapPin aria-hidden="true" className="size-4" />
          {t('postForm.addPlace')}
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
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
            className="inline-flex min-h-11 items-center gap-2 text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
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
          <Button
            variant="ghost"
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(null)}
          >
            {t('postForm.removePlace')}
          </Button>
        </div>
      )}
    </fieldset>
  )
}
