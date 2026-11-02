import { getReasonPhrase, StatusCodes } from 'http-status-codes'

import { isGlobalError } from '@/server/errors/global-error'
import { type RouteHandler } from '@/server/lib/handler'

type ErrorBody = {
  statusCode: number
  error: string
  message: string
  details?: unknown
}

const toErrorBody = (statusCode: number, message: string, details?: unknown): ErrorBody => ({
  statusCode,
  error: getReasonPhrase(statusCode),
  message,
  details,
})

const resolveErrorBody = (error: unknown): ErrorBody => {
  if (isGlobalError(error)) {
    return toErrorBody(error.statusCode, error.message, error.details)
  }
  return toErrorBody(StatusCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
}

const toRetryAfterHeaders = (details: unknown): Record<string, string> =>
  typeof details === 'object' &&
  details !== null &&
  'retryAfterSeconds' in details &&
  typeof details.retryAfterSeconds === 'number'
    ? { 'Retry-After': String(Math.max(details.retryAfterSeconds, 0)) }
    : {}

export const withErrorHandler =
  (handler: RouteHandler): RouteHandler =>
  async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      const body = resolveErrorBody(error)
      return Response.json(body, {
        status: body.statusCode,
        headers: toRetryAfterHeaders(body.details),
      })
    }
  }
