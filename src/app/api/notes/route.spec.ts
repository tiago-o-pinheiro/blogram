// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { createSessionCookie } from '@/test/auth-session'

import { DELETE, GET as GET_ONE, PUT } from './[id]/route'
import { GET, POST } from './route'

const URL_BASE = 'http://test/api/notes'

let cookie = ''

const postNote = (payload: unknown) =>
  POST(
    new Request(URL_BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(payload),
    }),
  )

const putNote = (id: string, payload: unknown) =>
  PUT(
    new Request(`${URL_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id }) },
  )

const getNote = (id: string) =>
  GET_ONE(new Request(`${URL_BASE}/${id}`, { headers: { cookie } }), {
    params: Promise.resolve({ id }),
  })

const deleteNote = (id: string) =>
  DELETE(new Request(`${URL_BASE}/${id}`, { method: 'DELETE', headers: { cookie } }), {
    params: Promise.resolve({ id }),
  })

describe('notes routes', () => {
  beforeEach(async () => {
    cookie = await createSessionCookie()
  })

  it('Given a valid bundle, should create a note with 201', async () => {
    const response = await postNote({ title: '::title::', body: '::body::' })
    const note = await response.json()

    expect(response.status).toBe(StatusCodes.CREATED)
    expect(Models.isNote(note)).toBe(true)
    expect(note.title).toBe('::title::')
  })

  it('Given an empty title, should respond 422', async () => {
    const response = await postNote({ title: '', body: '' })

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given several notes, should list a page with meta and filter by search', async () => {
    await postNote({ title: '::alpha::' })
    await postNote({ title: '::beta::' })

    const all = await (
      await GET(new Request(`${URL_BASE}?pageSize=1`, { headers: { cookie } }))
    ).json()
    const filtered = await (
      await GET(new Request(`${URL_BASE}?search=alpha`, { headers: { cookie } }))
    ).json()

    expect(all.data).toHaveLength(1)
    expect(all.meta).toEqual({ total: 2, page: 1, pageSize: 1 })
    expect(filtered.data.map((note: Models.NoteLite) => note.title)).toEqual(['::alpha::'])
  })

  it('Given an existing note, should get it with 200', async () => {
    const created = await (await postNote({ title: '::title::' })).json()

    const response = await getNote(created.id)

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual(created)
  })

  it('Given an unknown id, should respond 404 on get, update and delete', async () => {
    const id = randomUUID()

    expect((await getNote(id)).status).toBe(StatusCodes.NOT_FOUND)
    expect((await putNote(id, { title: '::title::' })).status).toBe(StatusCodes.NOT_FOUND)
    expect((await deleteNote(id)).status).toBe(StatusCodes.NOT_FOUND)
  })

  it('Given a malformed id, should respond 422', async () => {
    const response = await getNote('::id::')

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
  })

  it('Given an existing note, should update it with 200', async () => {
    const created = await (await postNote({ title: '::title::' })).json()

    const response = await putNote(created.id, { title: '::other-title::', body: '::body::' })
    const updated = await response.json()

    expect(response.status).toBe(StatusCodes.OK)
    expect(updated.title).toBe('::other-title::')
    expect(updated.body).toBe('::body::')
  })

  it('Given an existing note, should delete it with 204 and then respond 404', async () => {
    const created = await (await postNote({ title: '::title::' })).json()

    const response = await deleteNote(created.id)

    expect(response.status).toBe(StatusCodes.NO_CONTENT)
    expect((await getNote(created.id)).status).toBe(StatusCodes.NOT_FOUND)
  })

  it.each([
    ['list', () => GET(new Request(URL_BASE))],
    ['create', () => POST(new Request(URL_BASE, { method: 'POST', body: '{}' }))],
    [
      'get',
      () =>
        GET_ONE(new Request(`${URL_BASE}/::id::`), { params: Promise.resolve({ id: '::id::' }) }),
    ],
    [
      'update',
      () =>
        PUT(new Request(`${URL_BASE}/::id::`, { method: 'PUT', body: '{}' }), {
          params: Promise.resolve({ id: '::id::' }),
        }),
    ],
    [
      'delete',
      () =>
        DELETE(new Request(`${URL_BASE}/::id::`, { method: 'DELETE' }), {
          params: Promise.resolve({ id: '::id::' }),
        }),
    ],
  ])('Given no session, should respond 401 on %s', async (_name, send) => {
    const response = await send()

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })
})
