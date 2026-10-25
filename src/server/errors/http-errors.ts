import { StatusCodes } from 'http-status-codes'

import { type Models } from '@/models'

import { GlobalError } from './global-error'

export class NotFoundError extends GlobalError {
  constructor(message = 'Not found', details?: unknown) {
    super(message, StatusCodes.NOT_FOUND, details)
  }
}

export class ConflictError extends GlobalError {
  constructor(message = 'Conflict', details?: unknown) {
    super(message, StatusCodes.CONFLICT, details)
  }
}

export class ValidationError extends GlobalError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, details)
  }
}

export class ForbiddenError extends GlobalError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, StatusCodes.FORBIDDEN, details)
  }
}

export class UnauthorizedError extends GlobalError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(message, StatusCodes.UNAUTHORIZED, details)
  }
}

export class TooManyRequestsError extends GlobalError {
  constructor(message = 'Too many requests', details?: { retryAfterSeconds: number }) {
    super(message, StatusCodes.TOO_MANY_REQUESTS, details)
  }
}

export class ServiceUnavailableError extends GlobalError {
  constructor(message = 'Service unavailable', details?: unknown) {
    super(message, StatusCodes.SERVICE_UNAVAILABLE, details)
  }
}

export class BadGatewayError extends GlobalError {
  constructor(message = 'Bad gateway', details?: { reason: Models.AiFailureReason }) {
    super(message, StatusCodes.BAD_GATEWAY, details)
  }
}

export class PayloadTooLargeError extends GlobalError {
  constructor(message = 'Payload too large', details?: unknown) {
    super(message, StatusCodes.REQUEST_TOO_LONG, details)
  }
}
