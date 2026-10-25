// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { db } from '@/server/lib/db'
import { ArchiveService } from '@/server/modules/feed/services/archive.service'
import { media } from '@/server/modules/media/schemas/media.table'
import { post } from '@/server/modules/posts/schemas/post.table'

const service = new ArchiveService()

const seedPost = (publicId: string, publishedAt: string, overrides = {}) =>
  db.insert(post).values({
    publicId,
    type: 'news',
    status: 'published',
    text: '::caption::',
    publishedAt: new Date(publishedAt),
    ...overrides,
  })

describe('ArchiveService', () => {
  it('Given no published posts, should return an empty archive', async () => {
    await seedPost('Draft12345', '2026-01-01T00:00:00Z', { status: 'draft' })

    expect(await service.get()).toEqual({ years: [], year: null, months: [] })
  })

  it('Given several years, should list years newest first and default to the newest', async () => {
    await seedPost('Aaaaa11111', '2025-03-10T10:00:00Z')
    await seedPost('Bbbbb22222', '2026-02-10T10:00:00Z')
    await seedPost('Ccccc33333', '2026-05-10T10:00:00Z')

    const archive = await service.get()

    expect(archive.years).toEqual([
      { year: 2026, count: 2 },
      { year: 2025, count: 1 },
    ])
    expect(archive.year).toBe(2026)
    expect(archive.months.map((month) => month.month)).toEqual(['2026-05', '2026-02'])
  })

  it('Given an unknown year, should fall back to the newest year', async () => {
    await seedPost('Aaaaa11111', '2025-03-10T10:00:00Z')

    expect((await service.get(1999)).year).toBe(2025)
  })

  it('Given a selected year, should group its posts by UTC month and skip drafts', async () => {
    await seedPost('Aaaaa11111', '2025-12-31T23:30:00Z')
    await seedPost('Bbbbb22222', '2025-12-01T00:30:00Z')
    await seedPost('Ccccc33333', '2025-11-15T10:00:00Z')
    await seedPost('Draft12345', '2025-11-16T10:00:00Z', { status: 'draft' })
    await seedPost('Other12345', '2026-01-01T00:00:00Z')

    const archive = await service.get(2025)

    expect(archive.year).toBe(2025)
    expect(
      archive.months.map((month) => [month.month, month.posts.map((item) => item.id)]),
    ).toEqual([
      ['2025-12', ['Aaaaa11111', 'Bbbbb22222']],
      ['2025-11', ['Ccccc33333']],
    ])
  })

  it('Given posts with titles, captions and images, should summarise them', async () => {
    const [titled] = await seedPost('Aaaaa11111', '2025-03-10T10:00:00Z', {
      type: 'photo',
      title: '::title::',
    }).returning({ id: post.id })
    await seedPost('Bbbbb22222', '2025-03-09T10:00:00Z', { text: `${'a'.repeat(120)}` })
    if (!titled) {
      throw new Error('post not seeded')
    }
    await db.insert(media).values({
      postId: titled.id,
      key: 'k',
      contentType: 'image/webp',
      width: 10,
      height: 20,
      sizeBytes: 1,
    })

    const [first, second] = (await service.get(2025)).months[0]?.posts ?? []

    expect(first).toMatchObject({ title: '::title::', image: { width: 10, height: 20 } })
    expect(second).toMatchObject({ title: 'a'.repeat(80), image: null })
  })
})
