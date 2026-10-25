// @vitest-environment node
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, it } from 'vitest'

import { Models } from '@/models'

import { DELETE as DELETE_POSTS, POST as POST_POST } from '@/app/api/admin/posts/route'
import { db } from '@/server/lib/db'
import { storage } from '@/server/lib/storage'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'
import { postService } from '@/server/modules/posts/services/post.service'
import { createOwnerSession } from '@/test/auth-session'
import { createJpegWithGps } from '@/test/image-fixtures'

const URL = 'http://localhost:3000/api/admin/posts'

const sendDelete = (body: unknown, cookie?: string) =>
  new Request(URL, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })

describe('delete all posts route', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = await createOwnerSession()
  })

  const createPost = async () => {
    const form = new FormData()
    form.set('type', 'photo')
    form.set(
      'file',
      new File([new Uint8Array(await createJpegWithGps())], 'a.jpg', { type: 'image/jpeg' }),
    )
    await POST_POST(new Request(URL, { method: 'POST', headers: { cookie }, body: form }))
  }

  it('Given no session, should answer 401 and delete nothing', async () => {
    await createPost()

    const response = await DELETE_POSTS(sendDelete({ confirm: Models.DELETE_ALL_POSTS_CONFIRM }))

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
    expect(await postService.countPosts()).toBe(1)
  })

  it('Given the confirm literal, should remove every post, media row and stored file', async () => {
    await createPost()
    await createPost()
    const rows = await db.select().from(media)
    const keys = rows.flatMap((row) => [row.key, ...row.variants.map((variant) => variant.key)])

    const response = await DELETE_POSTS(
      sendDelete({ confirm: Models.DELETE_ALL_POSTS_CONFIRM }, cookie),
    )

    expect(response.status).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ deleted: 2 })
    expect(await db.select().from(post)).toEqual([])
    expect(await db.select().from(media)).toEqual([])
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(await storage.get(key)).toBeNull()
    }
  })

  it('Given a wrong confirm value, should answer 422 and delete nothing', async () => {
    await createPost()

    const response = await DELETE_POSTS(sendDelete({ confirm: 'yes' }, cookie))

    expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    expect(await postService.countPosts()).toBe(1)
  })
})
