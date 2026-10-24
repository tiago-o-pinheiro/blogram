import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { PaginationQuery, PaginationResult } from './pagination.model'

export const POST_TYPES = ['photo', 'video', 'youtube', 'link', 'news'] as const
export const CREATABLE_POST_TYPES = POST_TYPES
export const POST_STATUSES = ['draft', 'published'] as const
export const POST_TEXT_MAX = 2000
export const ALT_TEXT_MAX = 500
export const POST_ID_PATTERN = '^[A-Za-z0-9_-]{10}$'
export const IMAGE_VARIANT_NAMES = ['w480', 'w960', 'w1600'] as const
export const MEDIA_PATH = '/api/media'

export const PostType = Type.Union([
  Type.Literal('photo'),
  Type.Literal('video'),
  Type.Literal('youtube'),
  Type.Literal('link'),
  Type.Literal('news'),
])
export type PostType = Static<typeof PostType>

export const PostStatus = Type.Union([Type.Literal('draft'), Type.Literal('published')])
export type PostStatus = Static<typeof PostStatus>

export const ImageVariantName = Type.Union([
  Type.Literal('w480'),
  Type.Literal('w960'),
  Type.Literal('w1600'),
])
export type ImageVariantName = Static<typeof ImageVariantName>

export const ImageVariant = Type.Object({
  name: ImageVariantName,
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
})
export type ImageVariant = Static<typeof ImageVariant>

export const PostImage = Type.Object({
  id: Type.String({ format: 'uuid' }),
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
  altText: Type.String({ maxLength: ALT_TEXT_MAX }),
  variants: Type.Array(ImageVariant),
})
export type PostImage = Static<typeof PostImage>

export const PostVideo = Type.Object({
  id: Type.String({ format: 'uuid' }),
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
  contentType: Type.Union([Type.Literal('video/mp4'), Type.Literal('video/webm')]),
})
export type PostVideo = Static<typeof PostVideo>

export const PostYoutube = Type.Object({
  videoId: Type.String({ pattern: '^[A-Za-z0-9_-]{11}$' }),
  url: Type.String({ maxLength: 2048 }),
  thumbnailUrl: Type.String({ maxLength: 2048 }),
})
export type PostYoutube = Static<typeof PostYoutube>

export const PostLink = Type.Object({
  url: Type.String({ minLength: 1, maxLength: 2048 }),
  title: Type.String({ minLength: 1, maxLength: 300 }),
  description: Type.String({ maxLength: 1000 }),
  source: Type.String({ maxLength: 300 }),
})
export type PostLink = Static<typeof PostLink>

export const LinkMetadata = Type.Object({
  url: Type.String({ maxLength: 2048 }),
  title: Type.String({ maxLength: 300 }),
  description: Type.String({ maxLength: 1000 }),
  source: Type.String({ maxLength: 300 }),
})
export type LinkMetadata = Static<typeof LinkMetadata>
export const isLinkMetadata = (value: unknown): value is LinkMetadata =>
  Value.Check(LinkMetadata, value)

export const PLACE_NAME_MAX = 300
export const PLACE_MAP_URL_PATTERN = '^https://(www\\.)?openstreetmap\\.org/[^\\s]*$'
export const PostPlace = Type.Object({
  name: Type.String({ minLength: 1, maxLength: PLACE_NAME_MAX, pattern: '\\S' }),
  mapUrl: Type.Optional(Type.String({ maxLength: 2048, pattern: PLACE_MAP_URL_PATTERN })),
})
export type PostPlace = Static<typeof PostPlace>

export const Post = Type.Object({
  id: Type.String({ pattern: POST_ID_PATTERN }),
  type: PostType,
  status: PostStatus,
  text: Type.String({ maxLength: POST_TEXT_MAX }),
  place: Type.Optional(PostPlace),
  likes: Type.Integer({ minimum: 0 }),
  publishedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  image: Type.Union([PostImage, Type.Null()]),
  video: Type.Optional(PostVideo),
  youtube: Type.Optional(PostYoutube),
  link: Type.Optional(PostLink),
})
export type Post = Static<typeof Post>

export const PostUpdate = Type.Object(
  {
    place: Type.Optional(Type.Union([PostPlace, Type.Null()])),
    text: Type.Optional(Type.String({ maxLength: POST_TEXT_MAX })),
    altText: Type.Optional(Type.String({ maxLength: ALT_TEXT_MAX })),
    url: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 300 })),
    description: Type.Optional(Type.String({ maxLength: 1000 })),
    source: Type.Optional(Type.String({ maxLength: 300 })),
  },
  { minProperties: 1 },
)
export type PostUpdate = Static<typeof PostUpdate>

export const PostStatusChange = Type.Object({ status: PostStatus })
export type PostStatusChange = Static<typeof PostStatusChange>

export const PostListQuery = Type.Intersect([
  PaginationQuery,
  Type.Object({ status: Type.Optional(PostStatus) }),
])
export type PostListQuery = Static<typeof PostListQuery>

export const PostPage = PaginationResult(Post)
export type PostPage = Static<typeof PostPage>

export const isPost = (value: unknown): value is Post => Value.Check(Post, value)
export const isPostPage = (value: unknown): value is PostPage => Value.Check(PostPage, value)
export const isPostUpdate = (value: unknown): value is PostUpdate => Value.Check(PostUpdate, value)
export const isPostStatusChange = (value: unknown): value is PostStatusChange =>
  Value.Check(PostStatusChange, value)
export const isPostListQuery = (value: unknown): value is PostListQuery =>
  Value.Check(PostListQuery, value)
