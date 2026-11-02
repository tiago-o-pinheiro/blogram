import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

export const getRecoveryCodesApiSchema = {
  response: { [StatusCodes.OK]: Models.RecoveryCodeStatus },
}
export type GetRecoveryCodesApiSchema = typeof getRecoveryCodesApiSchema

export const postRecoveryCodesApiSchema = {
  body: Models.RecoveryCodeGenerate,
  response: { [StatusCodes.CREATED]: Models.RecoveryCodeList },
}
export type PostRecoveryCodesApiSchema = typeof postRecoveryCodesApiSchema

export const postRecoveryRedeemApiSchema = {
  body: Models.RecoveryCodeRedeem,
  response: { [StatusCodes.OK]: Models.RecoveryCodeRedeemed },
}
export type PostRecoveryRedeemApiSchema = typeof postRecoveryRedeemApiSchema
