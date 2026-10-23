import { StatusCodes } from 'http-status-codes'
import { Type } from 'typebox'

import { Models } from '@/models'

import { NotFoundError } from '@/server/errors/http-errors'
import { readParams, type RouteHandler } from '@/server/lib/handler'
import { authService, type AuthService } from '@/server/modules/auth/services/auth.service'
import { postService, type PostService } from '@/server/modules/posts/services/post.service'

const MediaIdParams = Type.Object({ id: Type.String() })
const PUBLIC_CACHE_CONTROL = 'public, max-age=0, must-revalidate'
const PRIVATE_CACHE_CONTROL = 'private, no-store'
const FULL_VARIANT = 'full'

const toVariant = (value: string | null): typeof FULL_VARIANT | Models.ImageVariantName => {
  if (value === null || value === FULL_VARIANT) {
    return FULL_VARIANT
  }
  const name = Models.IMAGE_VARIANT_NAMES.find((candidate) => candidate === value)
  if (!name) {
    throw new NotFoundError('Media not found')
  }
  return name
}

export class MediaController {
  constructor(
    private readonly authService: AuthService,
    private readonly postService: PostService,
  ) {}

  getMedia: RouteHandler = async (request, context) => {
    const { id } = await readParams(MediaIdParams, context)
    const variant = toVariant(new URL(request.url).searchParams.get('variant'))
    const user = await this.authService.findUser(request.headers)
    const { object, isPublic } = await this.postService.readMedia(id, {
      isOwner: user !== null,
      variant,
      range: variant === FULL_VARIANT ? request.headers.get('range') : null,
      isHead: request.method === 'HEAD' && variant === FULL_VARIANT,
    })
    const range = object.range
    return new Response(request.method === 'HEAD' ? null : new Uint8Array(object.body), {
      status: range ? StatusCodes.PARTIAL_CONTENT : StatusCodes.OK,
      headers: {
        'Content-Type': object.contentType,
        'Content-Length': String(range ? range.end - range.start + 1 : object.size),
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${object.size}` } : {}),
        'Cache-Control': isPublic ? PUBLIC_CACHE_CONTROL : PRIVATE_CACHE_CONTROL,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }
}

export const mediaController = new MediaController(authService, postService)
