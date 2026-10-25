import { Type, type Static } from 'typebox'

import { PaginationQuery } from './pagination.model'

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
const ARCHIVE_YEAR_MIN = 1970

export const FeedQuery = Type.Intersect([
  PaginationQuery,
  Type.Object({
    type: Type.Optional(FeedFilter),
    q: Type.Optional(Type.String({ minLength: 1, maxLength: FEED_SEARCH_MAX })),
  }),
])
export type FeedQuery = Static<typeof FeedQuery>

export type FeedScope = { q?: string }

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
  if (page > 1) {
    query.set('page', String(page))
  }
  return query.size > 0 ? `/?${query}` : '/'
}
