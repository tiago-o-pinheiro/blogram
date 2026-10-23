import { getReasonPhrase, StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { env } from '@/server/config/env'
import { TooManyRequestsError, ValidationError } from '@/server/errors/http-errors'
import { encode } from '@/server/lib/codec'
import { readBody, type RouteHandler } from '@/server/lib/handler'
import { MULTIPART_OVERHEAD_BYTES, readMultipart } from '@/server/lib/multipart'
import {
  postSetupFinalizeApiSchema,
  postSetupUnlockApiSchema,
  putSetupProfileApiSchema,
} from '@/server/modules/setup/schemas/setup.api-schema'
import {
  setupAuthService,
  type SetupAuthService,
} from '@/server/modules/setup/services/setup-auth.service'
import {
  setupSessionService,
  type SetupSessionService,
} from '@/server/modules/setup/services/setup-session.service'
import { setupService, type SetupService } from '@/server/modules/setup/services/setup.service'

const UNKNOWN_CLIENT_KEY = 'unknown'
const FINALIZE_REDIRECT = '/admin'

const toClientKey = (headers: Headers): string =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() || UNKNOWN_CLIENT_KEY

const toRetryAfterSeconds = (details: unknown): number | undefined =>
  typeof details === 'object' &&
  details !== null &&
  'retryAfterSeconds' in details &&
  typeof details.retryAfterSeconds === 'number'
    ? details.retryAfterSeconds
    : undefined

const toThrottledResponse = (error: TooManyRequestsError): Response => {
  const retryAfterSeconds = toRetryAfterSeconds(error.details)
  return Response.json(
    {
      statusCode: error.statusCode,
      error: getReasonPhrase(error.statusCode),
      message: error.message,
      details: error.details,
    },
    {
      status: error.statusCode,
      headers: retryAfterSeconds === undefined ? {} : { 'Retry-After': String(retryAfterSeconds) },
    },
  )
}

export class SetupController {
  constructor(
    private readonly setupService: SetupService,
    private readonly setupAuthService: SetupAuthService,
    private readonly setupSessionService: SetupSessionService,
  ) {}

  getState: RouteHandler = async (request) =>
    Response.json(encode(Models.SetupState, await this.setupService.getState(request.headers)), {
      status: StatusCodes.OK,
    })

  unlock: RouteHandler = async (request) => {
    const body = await readBody(postSetupUnlockApiSchema.body, request)
    try {
      const { token, expiresAt } = await this.setupAuthService.unlock(
        body.password,
        toClientKey(request.headers),
      )
      return new Response(null, {
        status: StatusCodes.NO_CONTENT,
        headers: { 'Set-Cookie': this.setupSessionService.toSetCookie(token, expiresAt) },
      })
    } catch (error) {
      if (error instanceof TooManyRequestsError) {
        return toThrottledResponse(error)
      }
      throw error
    }
  }

  saveProfile: RouteHandler = async (request) => {
    const body = await readBody(putSetupProfileApiSchema.body, request)
    const saved = await this.setupService.saveProfile(body)
    return Response.json(encode(Models.Profile, saved), { status: StatusCodes.OK })
  }

  uploadPhoto: RouteHandler = async (request) => {
    const form = await readMultipart(request, env.UPLOAD_MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES)
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new ValidationError('Field "file" is required')
    }
    const saved = await this.setupService.uploadPhoto(file)
    return Response.json(encode(Models.Profile, saved), { status: StatusCodes.OK })
  }

  finalize: RouteHandler = async (request) => {
    const body = await readBody(postSetupFinalizeApiSchema.body, request)
    const { authHeaders } = await this.setupService.finalize(body)
    const headers = new Headers()
    for (const cookie of authHeaders.getSetCookie()) {
      headers.append('Set-Cookie', cookie)
    }
    headers.append('Set-Cookie', this.setupSessionService.toClearCookie())
    return Response.json({ redirectTo: FINALIZE_REDIRECT }, { status: StatusCodes.OK, headers })
  }
}

export const setupController = new SetupController(
  setupService,
  setupAuthService,
  setupSessionService,
)
