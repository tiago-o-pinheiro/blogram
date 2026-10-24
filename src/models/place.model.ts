import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

export const PLACE_QUERY_MIN = 2
export const PLACE_QUERY_MAX = 100
export const PLACE_MAP_ZOOM = 12

const COORDINATE_DECIMALS = 5

export const PlaceCoordinates = Type.Object({
  lat: Type.Number({ minimum: -90, maximum: 90 }),
  lon: Type.Number({ minimum: -180, maximum: 180 }),
})
export type PlaceCoordinates = Static<typeof PlaceCoordinates>

export const PlaceSuggestion = Type.Intersect([
  PlaceCoordinates,
  Type.Object({
    id: Type.String({ minLength: 1, maxLength: 64 }),
    name: Type.String({ minLength: 1, maxLength: 200 }),
    region: Type.String({ maxLength: 200 }),
    country: Type.String({ maxLength: 200 }),
  }),
])
export type PlaceSuggestion = Static<typeof PlaceSuggestion>

export const PlaceSuggestionList = Type.Object({ data: Type.Array(PlaceSuggestion) })
export type PlaceSuggestionList = Static<typeof PlaceSuggestionList>
export const isPlaceSuggestionList = (value: unknown): value is PlaceSuggestionList =>
  Value.Check(PlaceSuggestionList, value)

export const PlaceSearchQuery = Type.Object({
  q: Type.String({ minLength: PLACE_QUERY_MIN, maxLength: PLACE_QUERY_MAX, pattern: '\\S' }),
  lang: Type.Optional(Type.Union([Type.Literal('en'), Type.Literal('es')])),
})
export type PlaceSearchQuery = Static<typeof PlaceSearchQuery>

export const toPlaceLabel = (place: Pick<PlaceSuggestion, 'name' | 'country'>): string =>
  [place.name, place.country].filter(Boolean).join(', ')

const roundCoordinate = (value: number): number => Number(value.toFixed(COORDINATE_DECIMALS))

export const toPlaceMapUrl = ({ lat, lon }: PlaceCoordinates): string => {
  const latitude = roundCoordinate(lat)
  const longitude = roundCoordinate(lon)
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${PLACE_MAP_ZOOM}/${latitude}/${longitude}`
}

const toCoordinates = (lat: string | null, lon: string | null): PlaceCoordinates | null => {
  if (!lat || !lon) {
    return null
  }
  const coordinates = { lat: Number(lat), lon: Number(lon) }
  return Value.Check(PlaceCoordinates, coordinates) ? coordinates : null
}

export const readPlaceCoordinates = (mapUrl?: string): PlaceCoordinates | null => {
  if (!mapUrl || !URL.canParse(mapUrl)) {
    return null
  }
  const url = new URL(mapUrl)
  const pinned = toCoordinates(url.searchParams.get('mlat'), url.searchParams.get('mlon'))
  if (pinned) {
    return pinned
  }
  const [, lat = null, lon = null] = url.hash.replace('#map=', '').split('/')
  return toCoordinates(lat, lon)
}
