import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { type Models } from '@/models'

import { ServiceUnavailableError } from '@/server/errors/http-errors'

const PHOTON_URL = 'https://photon.komoot.io/api/'
const PLACE_LIMIT = 6
const PLACE_TIMEOUT_MS = 5000
const USER_AGENT = 'Blogram/1.0 (+https://github.com/tiago-o-pinheiro/blogram)'
const PHOTON_LANGUAGES: Record<NonNullable<Models.PlaceSearchQuery['lang']>, string> = {
  en: 'en',
  es: 'default',
}

const PhotonFeature = Type.Object({
  geometry: Type.Object({ coordinates: Type.Tuple([Type.Number(), Type.Number()]) }),
  properties: Type.Object({
    osm_type: Type.String(),
    osm_id: Type.Number(),
    name: Type.Optional(Type.String()),
    state: Type.Optional(Type.String()),
    county: Type.Optional(Type.String()),
    country: Type.Optional(Type.String()),
  }),
})
type PhotonFeature = Static<typeof PhotonFeature>

const isPhotonFeature = (value: unknown): value is PhotonFeature =>
  Value.Check(PhotonFeature, value)

const PhotonResponse = Type.Object({ features: Type.Array(Type.Unknown()) })

const toSuggestion = (feature: PhotonFeature): Models.PlaceSuggestion | null => {
  const { properties, geometry } = feature
  const [lon, lat] = geometry.coordinates
  if (!properties.name) {
    return null
  }
  return {
    id: `${properties.osm_type}${properties.osm_id}`,
    name: properties.name,
    region: properties.state ?? properties.county ?? '',
    country: properties.country ?? '',
    lat,
    lon,
  }
}

const isSamePlace = (place: Models.PlaceSuggestion, other: Models.PlaceSuggestion): boolean =>
  place.name === other.name && place.region === other.region && place.country === other.country

export class PlaceService {
  constructor(private readonly send: typeof fetch = (input, init) => fetch(input, init)) {}

  search = async ({ q, lang }: Models.PlaceSearchQuery): Promise<Models.PlaceSuggestion[]> => {
    const url = new URL(PHOTON_URL)
    url.searchParams.set('q', q.trim())
    url.searchParams.set('limit', String(PLACE_LIMIT))
    url.searchParams.set('layer', 'city')
    url.searchParams.set('lang', PHOTON_LANGUAGES[lang ?? 'en'])
    const response = await this.send(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(PLACE_TIMEOUT_MS),
    }).catch(() => {
      throw new ServiceUnavailableError('Place search is unavailable')
    })
    const body: unknown = response.ok ? await response.json().catch(() => null) : null
    if (!Value.Check(PhotonResponse, body)) {
      throw new ServiceUnavailableError('Place search is unavailable')
    }
    return body.features
      .filter(isPhotonFeature)
      .map(toSuggestion)
      .filter((place) => place !== null)
      .filter((place, index, places) =>
        places.slice(0, index).every((other) => !isSamePlace(place, other)),
      )
  }
}

export const placeService = new PlaceService()
