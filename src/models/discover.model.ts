import { Type, type Static } from 'typebox'

import { PlaceCoordinates } from './place.model'
import { PostType } from './post.model'

export const PostSummaryImage = Type.Object({
  id: Type.String({ format: 'uuid' }),
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
})
export type PostSummaryImage = Static<typeof PostSummaryImage>

export const PostSummary = Type.Object({
  id: Type.String(),
  type: PostType,
  title: Type.String(),
  publishedAt: Type.String(),
  image: Type.Union([PostSummaryImage, Type.Null()]),
})
export type PostSummary = Static<typeof PostSummary>

export const ArchiveYear = Type.Object({
  year: Type.Integer(),
  count: Type.Integer({ minimum: 0 }),
})
export type ArchiveYear = Static<typeof ArchiveYear>

export const ArchiveMonth = Type.Object({
  month: Type.String({ pattern: '^\\d{4}-\\d{2}$' }),
  posts: Type.Array(PostSummary),
})
export type ArchiveMonth = Static<typeof ArchiveMonth>

export const Archive = Type.Object({
  years: Type.Array(ArchiveYear),
  year: Type.Union([Type.Integer(), Type.Null()]),
  months: Type.Array(ArchiveMonth),
})
export type Archive = Static<typeof Archive>

export const PlacePin = Type.Object({
  name: Type.String(),
  coordinates: Type.Union([PlaceCoordinates, Type.Null()]),
  posts: Type.Array(PostSummary),
})
export type PlacePin = Static<typeof PlacePin>

export const AdjacentPosts = Type.Object({
  newer: Type.Union([PostSummary, Type.Null()]),
  older: Type.Union([PostSummary, Type.Null()]),
})
export type AdjacentPosts = Static<typeof AdjacentPosts>
