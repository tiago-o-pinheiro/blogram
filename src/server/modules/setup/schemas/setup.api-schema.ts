import { StatusCodes } from 'http-status-codes'
import { Type } from 'typebox'

import { Models } from '@/models'

export const getSetupApiSchema = {
  response: { [StatusCodes.OK]: Models.SetupState },
}
export type GetSetupApiSchema = typeof getSetupApiSchema

export const postSetupUnlockApiSchema = {
  body: Models.SetupUnlock,
}
export type PostSetupUnlockApiSchema = typeof postSetupUnlockApiSchema

export const putSetupProfileApiSchema = {
  body: Models.ProfileBundle,
  response: { [StatusCodes.OK]: Models.Profile },
}
export type PutSetupProfileApiSchema = typeof putSetupProfileApiSchema

export const postSetupPhotoApiSchema = {
  response: { [StatusCodes.OK]: Models.Profile },
}
export type PostSetupPhotoApiSchema = typeof postSetupPhotoApiSchema

export const SetupFinalized = Type.Object({ redirectTo: Type.Literal('/admin') })

export const postSetupFinalizeApiSchema = {
  body: Models.SetupOwner,
  response: { [StatusCodes.OK]: SetupFinalized },
}
export type PostSetupFinalizeApiSchema = typeof postSetupFinalizeApiSchema
