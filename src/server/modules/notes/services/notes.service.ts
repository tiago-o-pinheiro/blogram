import { count, desc, eq, ilike } from 'drizzle-orm'

import { type Models } from '@/models'

import { NotFoundError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { toPagination, toPaginationMeta } from '@/server/lib/pagination'
import { notes } from '@/server/modules/notes/schemas/notes.table'

const noteColumns = {
  id: notes.id,
  title: notes.title,
  body: notes.body,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
}

const noteLiteColumns = {
  id: notes.id,
  title: notes.title,
  createdAt: notes.createdAt,
}

type NoteRow = {
  id: string
  title: string
  body: string
  createdAt: Date
  updatedAt: Date
}

type NoteLiteRow = {
  id: string
  title: string
  createdAt: Date
}

const toNote = (row: NoteRow): Models.Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const toNoteLite = (row: NoteLiteRow): Models.NoteLite => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
})

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`)

export class NotesService {
  listNotes = async (
    filter: Models.NoteFilter,
  ): Promise<Models.PaginationResult<Models.NoteLite>> => {
    const { take, skip } = toPagination(filter)
    const where = filter.search
      ? ilike(notes.title, `%${escapeLikePattern(filter.search)}%`)
      : undefined
    const [rows, [totals]] = await Promise.all([
      db
        .select(noteLiteColumns)
        .from(notes)
        .where(where)
        .orderBy(desc(notes.createdAt))
        .limit(take)
        .offset(skip),
      db.select({ total: count() }).from(notes).where(where),
    ])
    return { data: rows.map(toNoteLite), meta: toPaginationMeta(totals?.total ?? 0, filter) }
  }

  getNote = async (id: string): Promise<Models.Note> => {
    const [row] = await db.select(noteColumns).from(notes).where(eq(notes.id, id))
    if (!row) {
      throw new NotFoundError('Note not found')
    }
    return toNote(row)
  }

  createNote = async (bundle: Models.NoteBundle): Promise<Models.Note> => {
    const [row] = await db.insert(notes).values(bundle).returning(noteColumns)
    if (!row) {
      throw new NotFoundError('Note not found')
    }
    return toNote(row)
  }

  updateNote = async (id: string, bundle: Models.NoteBundle): Promise<Models.Note> => {
    const [row] = await db.update(notes).set(bundle).where(eq(notes.id, id)).returning(noteColumns)
    if (!row) {
      throw new NotFoundError('Note not found')
    }
    return toNote(row)
  }

  deleteNote = async (id: string): Promise<void> => {
    const [row] = await db.delete(notes).where(eq(notes.id, id)).returning({ id: notes.id })
    if (!row) {
      throw new NotFoundError('Note not found')
    }
  }
}

export const notesService = new NotesService()
