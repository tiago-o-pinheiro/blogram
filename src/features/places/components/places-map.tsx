'use client'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

import { useT } from '@/i18n/i18n-context'
import { Models } from '@/models'

type PlacesMapProps = { pins: Models.PlacePin[] }

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_MAX_ZOOM = 19
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const PIN_HTML =
  '<span class="block size-map-pin -translate-x-1/2 -translate-y-full animate-pin-drop text-map-pin drop-shadow-md"><svg viewBox="0 0 24 24" class="size-full stroke-map-pin-halo" fill="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" class="fill-map-pin-halo"/></svg></span>'

const buildPopup = (pin: Models.PlacePin, label: string): HTMLElement => {
  const container = document.createElement('div')
  container.className = 'animate-rise-in space-y-2'
  const heading = document.createElement('strong')
  heading.textContent = pin.name
  const link = document.createElement('a')
  link.href = Models.toFeedHref('all', 1, { place: pin.place })
  link.textContent = label
  link.className =
    'inline-flex min-h-11 press animate-fade-in items-center rounded-md px-3 transition focus-visible:outline-2 focus-visible:outline-ring'
  container.append(heading, link)
  return container
}

export const PlacesMap = ({ pins }: PlacesMapProps) => {
  const t = useT()
  const viewPosts = t('places.viewPosts')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }
    const map = L.map(container)
    L.tileLayer(TILE_URL, { maxZoom: TILE_MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map)
    const points: L.LatLngTuple[] = []
    for (const pin of pins) {
      if (!pin.coordinates) {
        continue
      }
      const point: L.LatLngTuple = [pin.coordinates.lat, pin.coordinates.lon]
      points.push(point)
      L.marker(point, {
        title: pin.name,
        icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [0, 0] }),
      })
        .bindPopup(buildPopup(pin, viewPosts))
        .addTo(map)
    }
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { maxZoom: Models.PLACE_MAP_ZOOM, padding: [32, 32] })
    } else {
      map.setView([0, 0], 1)
    }
    return () => {
      map.remove()
    }
  }, [pins, viewPosts])

  return <div ref={containerRef} className="isolate h-map w-full animate-fade-in bg-muted" />
}
