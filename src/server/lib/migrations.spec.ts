import { eq, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '@/server/lib/db'
import { user } from '@/server/modules/auth/schemas/auth.table'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'

const toPostRow = (publicId: string) => ({
  publicId,
  type: 'photo' as const,
})

const toMediaRow = (postId: string) => ({
  postId,
  key: '::key::',
  contentType: 'image/webp',
  width: 10,
  height: 10,
  sizeBytes: 1,
})

const listTables = async (): Promise<string[]> => {
  const result = await db.execute<{ table_name: string }>(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  )
  return result.rows.map((row) => row.table_name)
}

const toUserRow = (id: string) => ({
  id,
  name: id,
  email: `${id}@example.com`,
})

describe('migrations', () => {
  it('Given the migrations are applied, should not have the notes table', async () => {
    expect(await listTables()).not.toContain('notes')
  })

  it('Given the migrations are applied, should have the installation tables', async () => {
    expect(await listTables()).toEqual(
      expect.arrayContaining([
        'installation',
        'profile',
        'setup_session',
        'setup_attempt',
        'rate_limit',
      ]),
    )
  })

  it('Given the migrations are applied, should have the post and media tables', async () => {
    expect(await listTables()).toEqual(expect.arrayContaining(['post', 'media']))
  })

  it('Given negative likes, should reject the post row', async () => {
    await expect(db.insert(post).values({ ...toPostRow('likes001'), likes: -1 })).rejects.toThrow()
  })

  it('Given a duplicate public id, should reject the second post row', async () => {
    await db.insert(post).values(toPostRow('dup00001'))

    await expect(db.insert(post).values(toPostRow('dup00001'))).rejects.toThrow()
  })

  it('Given a published post without a date, should reject the row', async () => {
    await expect(
      db.insert(post).values({ ...toPostRow('pub00001'), status: 'published' }),
    ).rejects.toThrow()
  })

  it('Given a second media with the same post and role, should reject it', async () => {
    const [row] = await db.insert(post).values(toPostRow('role0001')).returning()
    if (!row) {
      throw new Error('post row was not inserted')
    }
    await db.insert(media).values(toMediaRow(row.id))

    await expect(db.insert(media).values(toMediaRow(row.id))).rejects.toThrow()
  })

  it('Given a post with media, should delete the media when the post is deleted', async () => {
    const [row] = await db.insert(post).values(toPostRow('casc0001')).returning()
    if (!row) {
      throw new Error('post row was not inserted')
    }
    await db.insert(media).values(toMediaRow(row.id))

    await db.delete(post).where(eq(post.id, row.id))

    expect(await db.select().from(media).where(eq(media.postId, row.id))).toEqual([])
  })

  it('Given an unsupported default locale, should reject the profile row', async () => {
    await expect(
      db.execute(sql`INSERT INTO profile (name, default_locale) VALUES ('::name::', 'fr')`),
    ).rejects.toThrow()
  })

  it('Given an existing user, should reject a second user row', async () => {
    await db.insert(user).values(toUserRow('first'))

    await expect(db.insert(user).values(toUserRow('second'))).rejects.toThrow()
  })
})
