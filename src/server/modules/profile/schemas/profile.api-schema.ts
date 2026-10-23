import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const putProfileApiSchema = {
  body: Models.ProfileBundle,
  response: { [StatusCodes.OK]: Models.Profile },
}
export type PutProfileApiSchema = typeof putProfileApiSchema

export const postProfilePhotoApiSchema = {
  response: { [StatusCodes.OK]: Models.Profile },
}
export type PostProfilePhotoApiSchema = typeof postProfilePhotoApiSchema

export const getSettingsApiSchema = {
  response: { [StatusCodes.OK]: Models.SiteSettings },
}
export type GetSettingsApiSchema = typeof getSettingsApiSchema

export const putSettingsApiSchema = {
  body: Models.SiteSettings,
  response: { [StatusCodes.OK]: Models.SiteSettings },
}
export type PutSettingsApiSchema = typeof putSettingsApiSchema
