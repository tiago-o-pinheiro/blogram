import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

export const IMAGE_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const VIDEO_UPLOAD_TYPES = ['video/mp4', 'video/webm'] as const
export const DEFAULT_UPLOAD_MAX_IMAGE_BYTES = 10485760
export const DEFAULT_UPLOAD_MAX_VIDEO_BYTES = 268435456
export const IMAGE_MAX_EDGE = 2560
export const VIDEO_UPLOAD_PART_BYTES = 10485760
export const VIDEO_UPLOAD_MAX_PARTS = 10000
export const VIDEO_UPLOAD_TTL_SECONDS = 21600
export const VIDEO_UPLOAD_MODES = ['direct', 'form'] as const
export type VideoUploadMode = (typeof VIDEO_UPLOAD_MODES)[number]

export const VideoUploadType = Type.Union([Type.Literal('video/mp4'), Type.Literal('video/webm')])
export type VideoUploadType = Static<typeof VideoUploadType>

export const VideoUploadStart = Type.Object({
  contentType: VideoUploadType,
  size: Type.Integer({ minimum: 1 }),
})
export type VideoUploadStart = Static<typeof VideoUploadStart>

const PartNumber = Type.Integer({ minimum: 1, maximum: VIDEO_UPLOAD_MAX_PARTS })

export const VideoUploadPart = Type.Object({
  partNumber: PartNumber,
  url: Type.String({ minLength: 1 }),
})
export type VideoUploadPart = Static<typeof VideoUploadPart>

export const VideoUploadSession = Type.Object({
  id: Type.String({ format: 'uuid' }),
  partSize: Type.Integer({ minimum: 1 }),
  parts: Type.Array(VideoUploadPart),
  expiresAt: Type.String({ format: 'date-time' }),
})
export type VideoUploadSession = Static<typeof VideoUploadSession>

export const VideoUploadEtag = Type.Object({
  partNumber: PartNumber,
  etag: Type.String({ minLength: 1, maxLength: 128, pattern: '^"?[A-Za-z0-9-]+"?$' }),
})
export type VideoUploadEtag = Static<typeof VideoUploadEtag>

export const VideoUploadCompletion = Type.Object({
  parts: Type.Array(VideoUploadEtag, { minItems: 1, maxItems: VIDEO_UPLOAD_MAX_PARTS }),
})
export type VideoUploadCompletion = Static<typeof VideoUploadCompletion>

export const VideoUploadReady = Type.Object({
  id: Type.String({ format: 'uuid' }),
  contentType: VideoUploadType,
  size: Type.Integer({ minimum: 1 }),
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
})
export type VideoUploadReady = Static<typeof VideoUploadReady>

export const VideoReplacement = Type.Object({ uploadId: Type.String({ format: 'uuid' }) })
export type VideoReplacement = Static<typeof VideoReplacement>

export const isVideoUploadSession = (value: unknown): value is VideoUploadSession =>
  Value.Check(VideoUploadSession, value)
export const isVideoUploadReady = (value: unknown): value is VideoUploadReady =>
  Value.Check(VideoUploadReady, value)
