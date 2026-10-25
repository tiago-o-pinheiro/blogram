import { StatusCodes } from 'http-status-codes'
import { Type } from 'typebox'

import { Models } from '@/models'

export const VideoUploadIdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

export const postVideoUploadApiSchema = {
  body: Models.VideoUploadStart,
  response: { [StatusCodes.CREATED]: Models.VideoUploadSession },
}
export type PostVideoUploadApiSchema = typeof postVideoUploadApiSchema

export const completeVideoUploadApiSchema = {
  params: VideoUploadIdParams,
  body: Models.VideoUploadCompletion,
  response: { [StatusCodes.OK]: Models.VideoUploadReady },
}
export type CompleteVideoUploadApiSchema = typeof completeVideoUploadApiSchema

export const deleteVideoUploadApiSchema = {
  params: VideoUploadIdParams,
}
export type DeleteVideoUploadApiSchema = typeof deleteVideoUploadApiSchema
