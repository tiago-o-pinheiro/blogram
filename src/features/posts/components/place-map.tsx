'use client'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'

import { MOTION } from '@/design-system/tokens/theme'
import * as Models from '@/models/models'

type PlaceMapProps = {
  coordinates: Models.PlaceCoordinates
  label: string
  onMove: (coordinates: Models.PlaceCoordinates) => void
}

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_MAX_ZOOM = 19
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const FLY_SECONDS = (MOTION.slower * 2) / 1000
const PIN_HTML =
  '<span class="block size-map-pin -translate-x-1/2 -translate-y-full animate-pin-drop text-map-pin drop-shadow-md"><svg viewBox="0 0 24 24" class="size-full stroke-map-pin-halo" fill="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" class="fill-map-pin-halo"/></svg></span>'

const toLatLng = ({ lat, lon }: Models.PlaceCoordinates): L.LatLngTuple => [lat, lon]

export const PlaceMap = ({ coordinates, label, onMove }: PlaceMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onMoveRef = useRef(onMove)
  const [initialCoordinates] = useState(coordinates)

  useEffect(() => {
    onMoveRef.current = onMove
  }, [onMove])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }
    const center = toLatLng(initialCoordinates)
    const map = L.map(container).setView(center, Models.PLACE_MAP_ZOOM)
    L.tileLayer(TILE_URL, { maxZoom: TILE_MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map)
    const marker = L.marker(center, {
      draggable: true,
      icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [0, 0] }),
    }).addTo(map)
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      onMoveRef.current({ lat, lon: lng })
    })
    mapRef.current = map
    markerRef.current = marker
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [initialCoordinates])

  useEffect(() => {
    const target = toLatLng(coordinates)
    markerRef.current?.setLatLng(target)
    mapRef.current?.flyTo(target, Models.PLACE_MAP_ZOOM, { duration: FLY_SECONDS })
  }, [coordinates])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      className="isolate h-map w-full bg-muted"
    />
  )
}
