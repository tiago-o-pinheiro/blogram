// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { GET } from '@/app/feed.xml/route'
import { NotFoundError } from '@/server/errors/http-errors'
import { db } from '@/server/lib/db'
import { authService } from '@/server/modules/auth/services/auth.service'
import { RssService } from '@/server/modules/feed/services/rss.service'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { post } from '@/server/modules/posts/schemas/post.table'

const ORIGIN = 'http://localhost:3000'
const service = new RssService()

const completeInstallation = () =>
  db.transaction(async (tx) => {
    const { id } = await authService.createOwner(tx, {
      identifier: 'owner@example.test',
      password: '::owner-password::-12345',
    })
    await installationService.completeInstallation(tx, id)
  })

const seedPost = (overrides: Partial<typeof post.$inferInsert> = {}) =>
  db.insert(post).values({
    publicId: 'Abcde12345',
    type: 'news',
    status: 'published',
    text: '::caption::',
    publishedAt: new Date('2026-10-20T12:00:00Z'),
    ...overrides,
  })

describe('RssService', () => {
  it('Given a pending install, should throw NotFoundError', async () => {
    await expect(service.render(ORIGIN)).rejects.toBeInstanceOf(NotFoundError)
    expect((await GET(new Request(`${ORIGIN}/feed.xml`))).status).toBe(404)
  })

  it('Given published posts and drafts, should list only published ones with permalinks', async () => {
    await completeInstallation()
    await seedPost()
    await seedPost({ publicId: 'Draft12345', status: 'draft', text: '::private-caption::' })

    const xml = await service.render(ORIGIN)

    expect(xml).toContain('<rss version="2.0">')
    expect(xml).toContain(`<link>${ORIGIN}/posts/Abcde12345</link>`)
    expect(xml).toContain('<guid isPermaLink="true">')
    expect(xml).toContain('<pubDate>Tue, 20 Oct 2026 12:00:00 GMT</pubDate>')
    expect(xml).not.toContain('::private-caption::')
    expect(xml).not.toContain('Draft12345')
  })

  it('Given a caption with markup, should escape it', async () => {
    await completeInstallation()
    await seedPost({ text: '<script>alert("x")</script> & more' })

    const xml = await service.render(ORIGIN)

    expect(xml).not.toContain('<script>')
    expect(xml).toContain('&amp;lt;script&amp;gt;')
  })

  it('Given 25 published posts, should return only the 20 newest', async () => {
    await completeInstallation()
    for (let index = 0; index < 25; index += 1) {
      await seedPost({
        publicId: `Post${String(index).padStart(6, '0')}`,
        publishedAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
      })
    }

    const xml = await service.render(ORIGIN)

    expect(xml.match(/<item>/g)).toHaveLength(20)
    expect(xml).toContain('Post000024')
    expect(xml).not.toContain('Post000000')
  })

  it('Given a completed install, should serve RSS with its content type from the route', async () => {
    await completeInstallation()

    const response = await GET(new Request(`${ORIGIN}/feed.xml`))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
  })
})
