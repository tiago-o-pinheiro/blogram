import { Type, type Static } from 'typebox'
import { Value } from 'typebox/value'

import { PaginationQuery } from './pagination.model'

export const NOTE_TITLE_MAX = 200
export const NOTE_BODY_MAX = 10000

export const Note = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String({ minLength: 1, maxLength: NOTE_TITLE_MAX }),
  body: Type.String({ maxLength: NOTE_BODY_MAX }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})
export type Note = Static<typeof Note>

export const NoteLite = Type.Pick(Note, ['id', 'title', 'createdAt'])
export type NoteLite = Static<typeof NoteLite>

export const NoteBundle = Type.Object({
  title: Type.String({ minLength: 1, maxLength: NOTE_TITLE_MAX }),
  body: Type.String({ maxLength: NOTE_BODY_MAX, default: '' }),
})
export type NoteBundle = Static<typeof NoteBundle>

export const NoteFilter = Type.Intersect([
  PaginationQuery,
  Type.Object({ search: Type.Optional(Type.String({ minLength: 1 })) }),
])
export type NoteFilter = Static<typeof NoteFilter>

export const isNote = (value: unknown): value is Note => Value.Check(Note, value)
