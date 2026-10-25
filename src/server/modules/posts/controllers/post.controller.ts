import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { env } from '@/server/config/env'
import { ValidationError } from '@/server/errors/http-errors'
import { coerce, decode, encode } from '@/server/lib/codec'
import { readBody, readParams, readQuery } from '@/server/lib/handler'
import { MULTIPART_OVERHEAD_BYTES, readMultipart } from '@/server/lib/multipart'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import {
  deletePostsApiSchema,
  getPostApiSchema,
  getPostsApiSchema,
  patchPostApiSchema,
  postPostApiSchema,
  putPostImageApiSchema,
  putPostVideoApiSchema,
  putPostStatusApiSchema,
} from '@/server/modules/posts/schemas/post.api-schema'
import { postService, type PostService } from '@/server/modules/posts/services/post.service'

const readForm = async (request: Request, maxFileBytes: number) => {
  const form = await readMultipart(request, maxFileBytes + MULTIPART_OVERHEAD_BYTES)
  const file = form.get('file')
  const poster = form.get('poster')
  return {
    form,
    file: file instanceof File ? file : undefined,
    poster: poster instanceof File ? poster : undefined,
  }
}

const readTextField = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : undefined
}

const readPlace = (form: FormData): Models.PostPlace | undefined => {
  const raw = readTextField(form, 'place')
  if (raw === undefined) {
    return undefined
  }
  let place: unknown
  try {
    place = JSON.parse(raw)
  } catch {
    throw new ValidationError('Place must be valid JSON')
  }
  return decode(Models.PostPlace, place)
}

export class PostController {
  constructor(private readonly postService: PostService) {}

  list: SessionRouteHandler = async (request) => {
    const query = readQuery(getPostsApiSchema.query, request)
    const page = await this.postService.listPosts(query)
    return Response.json(encode(Models.PostPage, page), { status: StatusCodes.OK })
  }

  create: SessionRouteHandler = async (request) => {
    const { form, file, poster } = await readForm(
      request,
      Math.max(env.UPLOAD_MAX_IMAGE_BYTES, env.UPLOAD_MAX_VIDEO_BYTES) + env.UPLOAD_MAX_IMAGE_BYTES,
    )
    const fields = decode(
      postPostApiSchema.fields,
      coerce(postPostApiSchema.fields, {
        type: readTextField(form, 'type'),
        place: readPlace(form),
        text: readTextField(form, 'text'),
        altText: readTextField(form, 'altText'),
        videoUploadId: readTextField(form, 'videoUploadId'),
        url: readTextField(form, 'url'),
        title: readTextField(form, 'title'),
        description: readTextField(form, 'description'),
        source: readTextField(form, 'source'),
      }),
    )
    const draft = await this.postService.createDraft({
      ...fields,
      file,
      poster,
    })
    return Response.json(encode(Models.Post, draft), { status: StatusCodes.CREATED })
  }

  get: SessionRouteHandler = async (_request, context) => {
    const { id } = await readParams(getPostApiSchema.params, context)
    const found = await this.postService.getPost(id)
    return Response.json(encode(Models.Post, found), { status: StatusCodes.OK })
  }

  update: SessionRouteHandler = async (request, context) => {
    const { id } = await readParams(patchPostApiSchema.params, context)
    const body = await readBody(patchPostApiSchema.body, request)
    const editedPost = await this.postService.updatePost(id, body)
    return Response.json(encode(Models.Post, editedPost), { status: StatusCodes.OK })
  }

  remove: SessionRouteHandler = async (_request, context) => {
    const { id } = await readParams(getPostApiSchema.params, context)
    await this.postService.deletePost(id)
    return new Response(null, { status: StatusCodes.NO_CONTENT })
  }

  removeAll: SessionRouteHandler = async (request) => {
    await readBody(deletePostsApiSchema.body, request)
    const result = await this.postService.deleteAllPosts()
    return Response.json(encode(Models.PostBulkDeleteResult, result), { status: StatusCodes.OK })
  }

  replaceImage: SessionRouteHandler = async (request, context) => {
    const { id } = await readParams(putPostImageApiSchema.params, context)
    const { file } = await readForm(request, env.UPLOAD_MAX_IMAGE_BYTES)
    if (!file) {
      throw new ValidationError('Field "file" is required')
    }
    const editedPost = await this.postService.replaceImage(id, file)
    return Response.json(encode(Models.Post, editedPost), { status: StatusCodes.OK })
  }

  replaceVideo: SessionRouteHandler = async (request, context) => {
    const { id } = await readParams(putPostVideoApiSchema.params, context)
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await readBody(putPostVideoApiSchema.body, request)
      const replaced = await this.postService.replaceVideo(id, { uploadId: body.uploadId })
      return Response.json(encode(Models.Post, replaced), { status: StatusCodes.OK })
    }
    const { file } = await readForm(request, env.UPLOAD_MAX_VIDEO_BYTES)
    if (!file) {
      throw new ValidationError('Field "file" is required')
    }
    const editedPost = await this.postService.replaceVideo(id, { file })
    return Response.json(encode(Models.Post, editedPost), { status: StatusCodes.OK })
  }

  changeStatus: SessionRouteHandler = async (request, context) => {
    const { id } = await readParams(putPostStatusApiSchema.params, context)
    const body = await readBody(putPostStatusApiSchema.body, request)
    const editedPost = await this.postService.setStatus(id, body.status)
    return Response.json(encode(Models.Post, editedPost), { status: StatusCodes.OK })
  }
}

export const postController = new PostController(postService)
