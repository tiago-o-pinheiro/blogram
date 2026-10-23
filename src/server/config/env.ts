import { StatusCodes } from 'http-status-codes'
import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { GlobalError } from '@/server/errors/global-error'

export const Env = Type.Object({
  NODE_ENV: Type.Union(
    [Type.Literal('development'), Type.Literal('test'), Type.Literal('production')],
    { default: 'development' },
  ),
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3000 }),
  CORS_ORIGIN: Type.String({ minLength: 1, default: 'http://localhost:3000' }),
  BETTER_AUTH_SECRET: Type.String({
    minLength: 32,
    default: 'dev-only-secret-change-me-0123456789abcdef',
  }),
  BETTER_AUTH_URL: Type.String({ format: 'url', default: 'http://localhost:3000' }),
  DATABASE_URL: Type.String({
    minLength: 1,
    default: 'postgresql://postgres:postgres@localhost:5432/app',
  }),
  SETUP_PASSWORD: Type.Optional(Type.String()),
  STORAGE_DRIVER: Type.Union([Type.Literal('local'), Type.Literal('s3')], { default: 'local' }),
  STORAGE_LOCAL_DIR: Type.String({ minLength: 1, default: '.data/uploads' }),
  S3_ENDPOINT: Type.Optional(Type.String({ minLength: 1 })),
  S3_REGION: Type.String({ minLength: 1, default: 'auto' }),
  S3_BUCKET: Type.Optional(Type.String({ minLength: 1 })),
  S3_ACCESS_KEY_ID: Type.Optional(Type.String({ minLength: 1 })),
  S3_SECRET_ACCESS_KEY: Type.Optional(Type.String({ minLength: 1 })),
  S3_FORCE_PATH_STYLE: Type.Boolean({ default: true }),
  UPLOAD_MAX_IMAGE_BYTES: Type.Integer({ minimum: 1, default: 10485760 }),
})
export type Env = Static<typeof Env>

export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const parsed = Value.Clean(Env, Value.Convert(Env, Value.Default(Env, { ...source })))
  if (!Value.Check(Env, parsed)) {
    const problems = Value.Errors(Env, parsed).map(
      (error) => `- ${error.instancePath.slice(1)}: ${error.message}`,
    )
    throw new GlobalError(
      ['Invalid environment variables:', ...problems].join('\n'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    )
  }
  return parsed
}

export const env = parseEnv(process.env)
