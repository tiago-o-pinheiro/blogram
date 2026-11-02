import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '@/server/lib/db'
import { post } from '@/server/modules/posts/schemas/post.table'
import { setupAttempt } from '@/server/modules/setup/schemas/setup.table'

import { POST } from './route'

const seedPost = (publicId = 'Aaaaa11111', status: 'published' | 'draft' = 'published') =>
  db.insert(post).values({
    publicId,
    type: 'news',
    status,
    text: '::caption::',
    publishedAt: new Date('2026-01-01T00:00:00Z'),
  })

const likePost = async (id: string, client = '192.0.2.1', forwarded = '198.51.100.1') =>
  POST(
    new Request(`http://localhost:3000/api/posts/${id}/like`, {
      method: 'POST',
      headers: { 'cf-connecting-ip': client, 'x-forwarded-for': forwarded },
    }),
    { params: Promise.resolve({ id }) },
  )

describe('Public likes protection', () => {
  it('BH-AUDIT-2: Given repeated client likes, should return the current count without incrementing', async () => {
    await seedPost()

    const first = await likePost('Aaaaa11111')
    const repeat = await likePost('Aaaaa11111', '192.0.2.1', '198.51.100.2')
    const other = await likePost('Aaaaa11111', '192.0.2.2')
    const current = await likePost('Aaaaa11111')

    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ likes: 1 })
    expect(repeat.status).toBe(200)
    expect(await repeat.json()).toEqual({ likes: 1 })
    expect(await other.json()).toEqual({ likes: 2 })
    expect(current.status).toBe(200)
    expect(await current.json()).toEqual({ likes: 2 })
  })

  it('BH-AUDIT-2: Given many repeats from one client, should record only one vote', async () => {
    await seedPost()
    const responses: Response[] = []

    for (const _ of Array.from({ length: 12 })) {
      responses.push(await likePost('Aaaaa11111'))
    }
    const [record] = await db
      .select({ likes: post.likes })
      .from(post)
      .where(eq(post.publicId, 'Aaaaa11111'))

    expect(responses.every((response) => response.status === 200)).toBe(true)
    expect(record?.likes).toBe(1)
  })

  it('BH-AUDIT-2: Given sixty client likes, should rate limit new votes with Retry-After', async () => {
    const records = Array.from({ length: 61 }, (_, index) => ({
      publicId: String(index).padStart(10, '0'),
      type: 'news' as const,
      status: 'published' as const,
      publishedAt: new Date('2026-01-01T00:00:00Z'),
    }))
    await db.insert(post).values(records)
    const accepted = await Promise.all(
      records.slice(0, 60).map((record) => likePost(record.publicId)),
    )

    const limited = await likePost('0000000060')
    const repeat = await likePost('0000000000')
    const other = await likePost('0000000060', '192.0.2.2')

    expect(accepted.every((response) => response.status === 200)).toBe(true)
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(Number(limited.headers.get('Retry-After'))).toBeLessThanOrEqual(900)
    expect(await limited.json()).toMatchObject({ statusCode: 429 })
    expect(repeat.status).toBe(200)
    expect(await repeat.json()).toEqual({ likes: 1 })
    expect(other.status).toBe(200)
    expect(await other.json()).toEqual({ likes: 1 })
  })

  it('BH-AUDIT-2: Given a draft or missing post, should reject likes without a claim', async () => {
    await seedPost('Aaaaa11111', 'draft')

    expect((await likePost('Aaaaa11111')).status).toBe(404)
    expect((await likePost('Missing123')).status).toBe(404)
    expect((await likePost('bad')).status).toBe(422)
    expect(await db.select().from(setupAttempt)).toEqual([])
  })
})
