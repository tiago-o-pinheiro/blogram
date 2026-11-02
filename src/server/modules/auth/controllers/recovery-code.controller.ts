import { StatusCodes } from 'http-status-codes'

import { Models } from '@/models'

import { toClientKey } from '@/server/lib/client-key'
import { encode } from '@/server/lib/codec'
import { readBody, type RouteHandler } from '@/server/lib/handler'
import { type SessionRouteHandler } from '@/server/modules/auth/controllers/auth.controller'
import {
  postRecoveryCodesApiSchema,
  postRecoveryRedeemApiSchema,
} from '@/server/modules/auth/schemas/recovery-code.api-schema'
import {
  recoveryCodeService,
  type RecoveryCodeService,
} from '@/server/modules/auth/services/recovery-code.service'

const NO_STORE = { 'Cache-Control': 'no-store' }

export class RecoveryCodeController {
  constructor(private readonly recoveryCodeService: RecoveryCodeService) {}

  getStatus: SessionRouteHandler = async (_request, _context, user) =>
    Response.json(
      encode(Models.RecoveryCodeStatus, await this.recoveryCodeService.getStatus(user.id)),
      { status: StatusCodes.OK, headers: NO_STORE },
    )

  generate: SessionRouteHandler = async (request, _context, user) => {
    const body = await readBody(postRecoveryCodesApiSchema.body, request)
    const created = await this.recoveryCodeService.generate(user.id, body.password)
    return Response.json(encode(Models.RecoveryCodeList, created), {
      status: StatusCodes.CREATED,
      headers: NO_STORE,
    })
  }

  redeem: RouteHandler = async (request) => {
    const body = await readBody(postRecoveryRedeemApiSchema.body, request)
    const redeemed = await this.recoveryCodeService.redeem(body, toClientKey(request.headers))
    return Response.json(encode(Models.RecoveryCodeRedeemed, redeemed), {
      status: StatusCodes.OK,
      headers: NO_STORE,
    })
  }
}

export const recoveryCodeController = new RecoveryCodeController(recoveryCodeService)
