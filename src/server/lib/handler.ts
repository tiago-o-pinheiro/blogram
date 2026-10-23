import { type TSchema } from 'typebox'
import { Value } from 'typebox/value'

import { ValidationError } from '@/server/errors/http-errors'
import { coerce, decode } from '@/server/lib/codec'

export type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>
}

export type RouteHandler = (
  request: Request,
  context?: RouteContext,
) => Promise<Response> | Response

export const readParams = async <Schema extends TSchema>(
  schema: Schema,
  context: RouteContext | undefined,
) => decode(schema, coerce(schema, await context?.params))

export const readQuery = <Schema extends TSchema>(schema: Schema, request: Request) =>
  decode(schema, coerce(schema, Object.fromEntries(new URL(request.url).searchParams)))

export const readBody = async <Schema extends TSchema>(schema: Schema, request: Request) => {
  const body: unknown = await request.json().catch(() => {
    throw new ValidationError('Request body must be valid JSON')
  })
  return decode(schema, Value.Default(schema, Value.Clone(body)))
}
