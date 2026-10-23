import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { notesController } from '@/server/modules/notes/controllers/notes.controller'

export const GET = withErrorHandler(requireSession(notesController.getNote))
export const PUT = withErrorHandler(requireSession(notesController.updateNote))
export const DELETE = withErrorHandler(requireSession(notesController.deleteNote))
