import { StatusCodes } from 'http-status-codes'
import { Type } from 'typebox'

import { Models } from '@/models'

const noteParams = Type.Pick(Models.Note, ['id'])

export const listNotesApiSchema = {
  querystring: Models.NoteFilter,
  response: { [StatusCodes.OK]: Models.PaginationResult(Models.NoteLite) },
}
export type ListNotesApiSchema = typeof listNotesApiSchema

export const getNoteApiSchema = {
  params: noteParams,
  response: { [StatusCodes.OK]: Models.Note },
}
export type GetNoteApiSchema = typeof getNoteApiSchema

export const createNoteApiSchema = {
  body: Models.NoteBundle,
  response: { [StatusCodes.CREATED]: Models.Note },
}
export type CreateNoteApiSchema = typeof createNoteApiSchema

export const updateNoteApiSchema = {
  params: noteParams,
  body: Models.NoteBundle,
  response: { [StatusCodes.OK]: Models.Note },
}
export type UpdateNoteApiSchema = typeof updateNoteApiSchema

export const deleteNoteApiSchema = {
  params: noteParams,
  response: { [StatusCodes.NO_CONTENT]: Type.Null() },
}
export type DeleteNoteApiSchema = typeof deleteNoteApiSchema
