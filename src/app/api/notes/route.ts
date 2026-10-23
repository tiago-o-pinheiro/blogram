import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { notesController } from '@/server/modules/notes/controllers/notes.controller'

export const GET = withErrorHandler(requireSession(notesController.listNotes))
export const POST = withErrorHandler(requireSession(notesController.createNote))
