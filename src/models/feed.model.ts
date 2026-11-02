import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { PaginationQuery } from './pagination.model'
import { PlaceCoordinates } from './place.model'
import { PLACE_NAME_MAX } from './post.model'

export const FEED_FILTERS = ['all', 'photo', 'video', 'link', 'news'] as const
export const FeedFilter = Type.Union([
  Type.Literal('all'),
  Type.Literal('photo'),
  Type.Literal('video'),
  Type.Literal('link'),
  Type.Literal('news'),
])
export type FeedFilter = Static<typeof FeedFilter>

export const FEED_SEARCH_MAX = 100
export const FEED_PLACE_MAX = 1400
const ARCHIVE_YEAR_MIN = 1970

export const FeedPlace = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: PLACE_NAME_MAX }),
    coordinates: Type.Union([PlaceCoordinates, Type.Null()]),
  },
  { additionalProperties: false },
)
export type FeedPlace = Static<typeof FeedPlace>

export const toFeedPlaceKey = ({ name, coordinates }: FeedPlace): string =>
  JSON.stringify({
    name,
    coordinates: coordinates ? { lat: coordinates.lat, lon: coordinates.lon } : null,
  })

export const readFeedPlace = (value: string): FeedPlace | undefined => {
  try {
    const place: unknown = JSON.parse(value)
    return Value.Check(FeedPlace, place) ? place : undefined
  } catch {
    return undefined
  }
}

export const toFeedPlace = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const param = value.trim()
  if (param.length === 0 || param.length > FEED_PLACE_MAX) {
    return undefined
  }
  const place = readFeedPlace(param)
  return place ? toFeedPlaceKey(place) : undefined
}

export const FeedQuery = Type.Intersect([
  PaginationQuery,
  Type.Object({
    type: Type.Optional(FeedFilter),
    q: Type.Optional(Type.String({ minLength: 1, maxLength: FEED_SEARCH_MAX })),
    place: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: FEED_PLACE_MAX,
        description:
          'JSON object {name,coordinates:{lat,lon}|null}. Matches the exact place name and parsed mapUrl coordinates; null matches only places without coordinates.',
      }),
    ),
  }),
])
export type FeedQuery = Static<typeof FeedQuery>

export type FeedScope = Pick<FeedQuery, 'q' | 'place'>

export const PostLikes = Type.Object({ likes: Type.Integer({ minimum: 0 }) })
export type PostLikes = Static<typeof PostLikes>

export const toFeedFilter = (value: unknown): FeedFilter =>
  FEED_FILTERS.find((filter) => filter === value) ?? 'all'

export const toFeedPage = (value: unknown): number => {
  if (typeof value !== 'string' || !/^[1-9]\d{0,5}$/.test(value)) {
    return 1
  }
  return Number(value)
}

export const toFeedSearch = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const search = value.trim()
  return search.length > 0 && search.length <= FEED_SEARCH_MAX ? search : undefined
}

export const toArchiveYear = (value: unknown): number | undefined => {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
    return undefined
  }
  const year = Number(value)
  return year >= ARCHIVE_YEAR_MIN ? year : undefined
}

export const toFeedHref = (filter: FeedFilter, page = 1, scope: FeedScope = {}): string => {
  const query = new URLSearchParams()
  if (filter !== 'all') {
    query.set('type', filter)
  }
  if (scope.q) {
    query.set('q', scope.q)
  }
  const place = toFeedPlace(scope.place)
  if (place) {
    query.set('place', place)
  }
  if (page > 1) {
    query.set('page', String(page))
  }
  return query.size > 0 ? `/?${query}` : '/'
}
