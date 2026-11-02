import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { OWNER_PASSWORD_MAX, OWNER_PASSWORD_MIN } from './owner-password.mjs'

export const RECOVERY_CODE_COUNT = 8
export const RECOVERY_CODE_GROUPS = 3
export const RECOVERY_CODE_GROUP_LENGTH = 4
export const RECOVERY_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const RECOVERY_CODE_INPUT_MAX = 64

const RECOVERY_CODE_LENGTH = RECOVERY_CODE_GROUPS * RECOVERY_CODE_GROUP_LENGTH
const LOOKALIKES: Readonly<Record<string, string>> = { O: '0', I: '1', L: '1' }

export const RecoveryCodeStatus = Type.Object({
  remaining: Type.Integer({ minimum: 0 }),
  generatedAt: Type.Union([Type.String(), Type.Null()]),
})
export type RecoveryCodeStatus = Static<typeof RecoveryCodeStatus>
export const isRecoveryCodeStatus = (value: unknown): value is RecoveryCodeStatus =>
  Value.Check(RecoveryCodeStatus, value)

export const RecoveryCodeList = Type.Object({
  codes: Type.Array(Type.String(), { minItems: 1 }),
})
export type RecoveryCodeList = Static<typeof RecoveryCodeList>
export const isRecoveryCodeList = (value: unknown): value is RecoveryCodeList =>
  Value.Check(RecoveryCodeList, value)

export const RecoveryCodeGenerate = Type.Object({
  password: Type.String({ minLength: 1, maxLength: OWNER_PASSWORD_MAX }),
})
export type RecoveryCodeGenerate = Static<typeof RecoveryCodeGenerate>

export const RecoveryCodeRedeem = Type.Object({
  code: Type.String({ minLength: 1, maxLength: RECOVERY_CODE_INPUT_MAX }),
  newPassword: Type.String({ minLength: OWNER_PASSWORD_MIN, maxLength: OWNER_PASSWORD_MAX }),
})
export type RecoveryCodeRedeem = Static<typeof RecoveryCodeRedeem>

export const RecoveryCodeRedeemed = Type.Object({ identifier: Type.String({ minLength: 1 }) })
export type RecoveryCodeRedeemed = Static<typeof RecoveryCodeRedeemed>
export const isRecoveryCodeRedeemed = (value: unknown): value is RecoveryCodeRedeemed =>
  Value.Check(RecoveryCodeRedeemed, value)

export const toRecoveryCode = (input: string): string | null => {
  const symbols = [...input.toUpperCase().replace(/[\s-]/g, '')].map(
    (symbol) => LOOKALIKES[symbol] ?? symbol,
  )
  if (
    symbols.length !== RECOVERY_CODE_LENGTH ||
    symbols.some((symbol) => !RECOVERY_CODE_ALPHABET.includes(symbol))
  ) {
    return null
  }
  return Array.from({ length: RECOVERY_CODE_GROUPS }, (_, group) =>
    symbols
      .slice(group * RECOVERY_CODE_GROUP_LENGTH, (group + 1) * RECOVERY_CODE_GROUP_LENGTH)
      .join(''),
  ).join('-')
}
