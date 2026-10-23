// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { NotFoundError } from '@/server/errors/http-errors'

import { notesService } from './notes.service'

describe('NotesService', () => {
  it('Given a bundle, should create a note and read it back', async () => {
    const created = await notesService.createNote({ title: '::title::', body: '::body::' })
    const found = await notesService.getNote(created.id)

    expect(found).toEqual(created)
    expect(found.title).toBe('::title::')
    expect(found.body).toBe('::body::')
  })

  it('Given an existing note, should update its fields', async () => {
    const { id } = await notesService.createNote({ title: '::title::', body: '' })

    const updated = await notesService.updateNote(id, {
      title: '::other-title::',
      body: '::body::',
    })

    expect(updated.title).toBe('::other-title::')
    expect(updated.body).toBe('::body::')
  })

  it('Given an unknown id, should throw NotFoundError on get, update and delete', async () => {
    const id = randomUUID()

    await expect(notesService.getNote(id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      notesService.updateNote(id, { title: '::title::', body: '' }),
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(notesService.deleteNote(id)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('Given a deleted note, should no longer find it', async () => {
    const { id } = await notesService.createNote({ title: '::title::', body: '' })

    await notesService.deleteNote(id)

    await expect(notesService.getNote(id)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('Given three notes and a page size of two, should report the total and the page', async () => {
    await notesService.createNote({ title: '::one::', body: '' })
    await notesService.createNote({ title: '::two::', body: '' })
    await notesService.createNote({ title: '::three::', body: '' })

    const page = await notesService.listNotes({ page: 2, pageSize: 2 })

    expect(page.meta).toEqual({ total: 3, page: 2, pageSize: 2 })
    expect(page.data).toHaveLength(1)
  })

  it('Given a search containing wildcards, should match them literally', async () => {
    await notesService.createNote({ title: '100% done', body: '' })
    await notesService.createNote({ title: '100 items', body: '' })

    const page = await notesService.listNotes({ page: 1, pageSize: 20, search: '100%' })

    expect(page.data.map((note) => note.title)).toEqual(['100% done'])
    expect(page.meta.total).toBe(1)
  })
})
