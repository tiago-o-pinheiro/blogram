'use client'

import { MapPin, MapPinPlus, Pencil, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/design-system/ui/dialog'
import { useT } from '@/i18n/i18n-context'
import { type Models } from '@/models'

import { PlacePicker } from './place-picker'

type PlaceFieldsProps = {
  value: Models.PostPlace | null
  onChange: (place: Models.PostPlace | null) => void
  isDisabled: boolean
}

export const PlaceFields = ({ value, onChange, isDisabled }: PlaceFieldsProps) => {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const pickerLabel = value ? t('postForm.editPlace') : t('postForm.addPlace')

  const handleSave = (place: Models.PostPlace) => {
    onChange(place)
    setIsOpen(false)
  }

  return (
    <fieldset
      disabled={isDisabled}
      className="flex min-w-0 flex-col gap-3 border-t border-line pt-4"
    >
      <legend className="sr-only">{t('postForm.place')}</legend>
      <div className="flex items-center justify-between gap-3">
        {value ? (
          <p
            key={value.name}
            className="flex min-w-0 animate-scale-in items-center gap-2 rounded-full bg-accent py-1.5 pr-4 pl-3 text-sm font-medium text-accent-foreground"
          >
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{value.name}</span>
          </p>
        ) : (
          <div aria-hidden="true" className="flex min-w-0 animate-fade-in flex-col gap-0.5">
            <span className="text-sm font-medium">{t('postForm.place')}</span>
            <span className="text-xs text-muted-foreground">{t('postForm.placeSummary')}</span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full"
                aria-label={pickerLabel}
                title={pickerLabel}
              >
                {value ? (
                  <Pencil aria-hidden="true" className="size-4" />
                ) : (
                  <MapPinPlus aria-hidden="true" className="size-5" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <PlacePicker value={value} onSave={handleSave} />
            </DialogContent>
          </Dialog>
          {value ? (
            <Button
              variant="ghost"
              size="icon"
              className="animate-scale-in rounded-full"
              aria-label={t('postForm.removePlace')}
              title={t('postForm.removePlace')}
              onClick={() => onChange(null)}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </fieldset>
  )
}
