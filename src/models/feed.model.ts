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

export const FeedQuery = Type.Intersect([
  PaginationQuery,
  Type.Object({ type: Type.Optional(FeedFilter) }),
])
export type FeedQuery = Static<typeof FeedQuery>

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

export const toFeedHref = (filter: FeedFilter, page = 1): string => {
  const query = new URLSearchParams()
  if (filter !== 'all') {
    query.set('type', filter)
  }
  if (page > 1) {
    query.set('page', String(page))
  }
  return query.size > 0 ? `/?${query}` : '/'
}
