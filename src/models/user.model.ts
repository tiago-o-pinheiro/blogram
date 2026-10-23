import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

export const User = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  email: Type.String({ minLength: 1 }),
})
export type User = Static<typeof User>

export const isUser = (value: unknown): value is User => Value.Check(User, value)
