'use client'

import { Check, MapPin, Search, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/design-system/ui/dialog'
import { cn } from '@/design-system/ui/lib/cn'
import { useLocale, useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { searchPlaces } from '../api/places-api'

const PlaceMap = dynamic(() => import('./place-map').then((module) => module.PlaceMap), {
  ssr: false,
  loading: () => <div className="h-map w-full animate-pulse bg-muted" />,
})

const SEARCH_DELAY_MS = 300

type SearchState = 'idle' | 'loading' | 'done' | 'error'

type PlaceSelection = {
  name: string
  coordinates: Models.PlaceCoordinates | null
}

type PlacePickerProps = {
  value: Models.PostPlace | null
  onSave: (place: Models.PostPlace) => void
}

type PlaceOptionProps = {
  id: string
  place: Models.PlaceSuggestion
  isActive: boolean
  onSelect: (place: Models.PlaceSuggestion) => void
}

const PlaceOption = ({ id, place, isActive, onSelect }: PlaceOptionProps) => (
  <li
    id={id}
    role="option"
    aria-selected={isActive}
    className={cn(
      'flex min-h-11 press animate-rise-in cursor-pointer items-center gap-3 rounded-lg px-3 py-2',
      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
    )}
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => onSelect(place)}
  >
    <MapPin aria-hidden="true" className="size-4 shrink-0" />
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium">{place.name}</span>
      <span className="truncate text-xs opacity-80">
        {[place.region, place.country].filter(Boolean).join(', ')}
      </span>
    </span>
  </li>
)

export const PlacePicker = ({ value, onSave }: PlacePickerProps) => {
  const t = useT()
  const locale = useLocale()
  const listId = useId()
  const [query, setQuery] = useState(value?.name ?? '')
  const [suggestions, setSuggestions] = useState<Models.PlaceSuggestion[]>([])
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [activeIndex, setActiveIndex] = useState(0)
  const [selection, setSelection] = useState<PlaceSelection | null>(
    value ? { name: value.name, coordinates: Models.readPlaceCoordinates(value.mapUrl) } : null,
  )
  const timerRef = useRef<number | undefined>(undefined)
  const controllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeSuggestion = suggestions[activeIndex]
  const isListOpen = selection === null && (searchState !== 'idle' || suggestions.length > 0)

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      controllerRef.current?.abort()
    },
    [],
  )

  const runSearch = async (text: string) => {
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const places = await searchPlaces({ q: text, lang: locale }, controller.signal)
      setSuggestions(places)
      setActiveIndex(0)
      setSearchState('done')
    } catch {
      if (!controller.signal.aborted) {
        setSearchState('error')
      }
    }
  }

  const handleQueryChange = (text: string) => {
    setQuery(text)
    setSelection(null)
    window.clearTimeout(timerRef.current)
    controllerRef.current?.abort()
    if (text.trim().length < Models.PLACE_QUERY_MIN) {
      setSuggestions([])
      setSearchState('idle')
      return
    }
    setSearchState('loading')
    timerRef.current = window.setTimeout(() => void runSearch(text.trim()), SEARCH_DELAY_MS)
  }

  const handleSelect = (place: Models.PlaceSuggestion) => {
    const name = Models.toPlaceLabel(place).slice(0, Models.PLACE_NAME_MAX)
    setQuery(name)
    setSelection({ name, coordinates: { lat: place.lat, lon: place.lon } })
    setSuggestions([])
    setSearchState('idle')
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isListOpen || suggestions.length === 0) {
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length)
    }
    if (event.key === 'Enter' && activeSuggestion) {
      event.preventDefault()
      handleSelect(activeSuggestion)
    }
  }

  const handleSave = () => {
    if (!selection) {
      return
    }
    onSave({
      name: selection.name,
      ...(selection.coordinates ? { mapUrl: Models.toPlaceMapUrl(selection.coordinates) } : {}),
    })
  }

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle>{value ? t('postForm.editPlace') : t('postForm.addPlace')}</DialogTitle>
        <DialogDescription>{t('postForm.placeIntro')}</DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={t('postForm.placeSearch')}
          aria-expanded={isListOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            isListOpen && activeSuggestion ? `${listId}-${activeIndex}` : undefined
          }
          placeholder={t('postForm.placeSearch')}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={Models.PLACE_QUERY_MAX}
          value={query}
          className="min-h-11 w-full rounded-full border border-input bg-background py-2 pr-4 pl-9 text-base transition-colors focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring"
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isListOpen && searchState === 'loading' ? (
        <p
          role="status"
          className="flex animate-fade-in items-center gap-2 px-3 text-sm text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {t('postForm.placeSearching')}
        </p>
      ) : null}
      {isListOpen && searchState === 'error' ? (
        <p role="alert" className="animate-rise-in px-3 text-sm text-danger">
          {t('postForm.placeError')}
        </p>
      ) : null}
      {isListOpen && searchState === 'done' && suggestions.length === 0 ? (
        <p role="status" className="animate-rise-in px-3 text-sm text-muted-foreground">
          {t('postForm.placeEmpty')}
        </p>
      ) : null}
      <ul
        id={listId}
        role="listbox"
        aria-label={t('postForm.placeResults')}
        className="flex flex-col gap-1 stagger empty:hidden"
      >
        {isListOpen && searchState === 'done'
          ? suggestions.map((place, index) => (
              <PlaceOption
                key={place.id}
                id={`${listId}-${index}`}
                place={place}
                isActive={index === activeIndex}
                onSelect={handleSelect}
              />
            ))
          : null}
      </ul>
      {selection?.coordinates ? (
        <figure className="flex animate-scale-in flex-col gap-2">
          <div className="overflow-hidden rounded-xl border border-line">
            <PlaceMap
              coordinates={selection.coordinates}
              label={t('postForm.placeMap', { name: selection.name })}
              onMove={(coordinates) =>
                setSelection((current) => (current ? { ...current, coordinates } : current))
              }
            />
          </div>
          <figcaption className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-map-pin" />
            <span className="min-w-0 truncate font-medium text-foreground">{selection.name}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{t('postForm.placeDragHint')}</span>
          </figcaption>
        </figure>
      ) : null}
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t('postForm.placeCancel')}
            title={t('postForm.placeCancel')}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogClose>
        <Button
          size="icon"
          className="rounded-full"
          aria-label={t('postForm.placeSave')}
          title={t('postForm.placeSave')}
          disabled={selection === null}
          onClick={handleSave}
        >
          <Check aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </>
  )
}
