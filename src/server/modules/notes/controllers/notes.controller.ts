import { StatusCodes } from 'http-status-codes'

import { encode } from '@/server/lib/codec'
import { readBody, readParams, readQuery, type RouteHandler } from '@/server/lib/handler'
import {
  createNoteApiSchema,
  deleteNoteApiSchema,
  getNoteApiSchema,
  listNotesApiSchema,
  updateNoteApiSchema,
} from '@/server/modules/notes/schemas/notes.api-schema'
import { type NotesService, notesService } from '@/server/modules/notes/services/notes.service'

export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  listNotes: RouteHandler = async (request) => {
    const filter = readQuery(listNotesApiSchema.querystring, request)
    const page = encode(
      listNotesApiSchema.response[StatusCodes.OK],
      await this.notesService.listNotes(filter),
    )
    return Response.json(page, { status: StatusCodes.OK })
  }

  getNote: RouteHandler = async (_request, context) => {
    const { id } = await readParams(getNoteApiSchema.params, context)
    const note = encode(
      getNoteApiSchema.response[StatusCodes.OK],
      await this.notesService.getNote(id),
    )
    return Response.json(note, { status: StatusCodes.OK })
  }

  createNote: RouteHandler = async (request) => {
    const bundle = await readBody(createNoteApiSchema.body, request)
    const note = encode(
      createNoteApiSchema.response[StatusCodes.CREATED],
      await this.notesService.createNote(bundle),
    )
    return Response.json(note, { status: StatusCodes.CREATED })
  }

  updateNote: RouteHandler = async (request, context) => {
    const { id } = await readParams(updateNoteApiSchema.params, context)
    const bundle = await readBody(updateNoteApiSchema.body, request)
    const note = encode(
      updateNoteApiSchema.response[StatusCodes.OK],
      await this.notesService.updateNote(id, bundle),
    )
    return Response.json(note, { status: StatusCodes.OK })
  }

  deleteNote: RouteHandler = async (_request, context) => {
    const { id } = await readParams(deleteNoteApiSchema.params, context)
    await this.notesService.deleteNote(id)
    encode(deleteNoteApiSchema.response[StatusCodes.NO_CONTENT], null)
    return new Response(null, { status: StatusCodes.NO_CONTENT })
  }
}

export const notesController = new NotesController(notesService)
