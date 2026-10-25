import { StatusCodes } from 'http-status-codes'
import { Type } from 'typebox'

import { Models } from '@/models'

export const PostIdParams = Type.Object({
  id: Type.String({ pattern: Models.POST_ID_PATTERN }),
})

export const PostCreateFields = Type.Object({
  place: Type.Optional(Models.PostPlace),
  type: Type.Union(Models.CREATABLE_POST_TYPES.map((type) => Type.Literal(type))),
  text: Type.String({ maxLength: Models.POST_TEXT_MAX, default: '' }),
  altText: Type.String({ maxLength: Models.ALT_TEXT_MAX, default: '' }),
  videoUploadId: Type.Optional(Type.String({ format: 'uuid' })),
  url: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
  title: Type.Optional(Type.String({ maxLength: Models.POST_TITLE_MAX })),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  source: Type.Optional(Type.String({ maxLength: 300 })),
})

export const getPostsApiSchema = {
  query: Models.PostListQuery,
  response: { [StatusCodes.OK]: Models.PostPage },
}
export type GetPostsApiSchema = typeof getPostsApiSchema

export const postPostApiSchema = {
  fields: PostCreateFields,
  response: { [StatusCodes.CREATED]: Models.Post },
}
export type PostPostApiSchema = typeof postPostApiSchema

export const getPostApiSchema = {
  params: PostIdParams,
  response: { [StatusCodes.OK]: Models.Post },
}
export type GetPostApiSchema = typeof getPostApiSchema

export const patchPostApiSchema = {
  params: PostIdParams,
  body: Models.PostUpdate,
  response: { [StatusCodes.OK]: Models.Post },
}
export type PatchPostApiSchema = typeof patchPostApiSchema

export const deletePostApiSchema = {
  params: PostIdParams,
  response: { [StatusCodes.NO_CONTENT]: Type.Null() },
}
export type DeletePostApiSchema = typeof deletePostApiSchema

export const putPostImageApiSchema = {
  params: PostIdParams,
  response: { [StatusCodes.OK]: Models.Post },
}
export type PutPostImageApiSchema = typeof putPostImageApiSchema

export const putPostVideoApiSchema = {
  params: PostIdParams,
  body: Models.VideoReplacement,
  response: { [StatusCodes.OK]: Models.Post },
}
export type PutPostVideoApiSchema = typeof putPostVideoApiSchema

export const putPostStatusApiSchema = {
  params: PostIdParams,
  body: Models.PostStatusChange,
  response: { [StatusCodes.OK]: Models.Post },
}
export type PutPostStatusApiSchema = typeof putPostStatusApiSchema

export const deletePostsApiSchema = {
  body: Models.PostBulkDelete,
  response: { [StatusCodes.OK]: Models.PostBulkDeleteResult },
}
export type DeletePostsApiSchema = typeof deletePostsApiSchema
