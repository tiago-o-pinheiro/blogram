// @vitest-environment node
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { GET, HEAD } from '@/app/api/media/[id]/route'
import { db } from '@/server/lib/db'
import { storage } from '@/server/lib/storage'
import { media } from '@/server/modules/media/schemas/media.table'
import { postService } from '@/server/modules/posts/services/post.service'
import { createPng } from '@/test/image-fixtures'

describe('Media route audit regressions', () => {
  it('BH-8: Given a missing stored object, should answer not found to HEAD and GET', async () => {
    const draft = await postService.createPhotoDraft({
      text: '',
      altText: '',
      file: new File([new Uint8Array(await createPng())], 'photo.png', { type: 'image/png' }),
    })
    await postService.setStatus(draft.id, 'published')
    const id = draft.image?.id ?? ''
    const [image] = await db.select().from(media).where(eq(media.id, id))
    await storage.delete(image?.key ?? '')
    const context = { params: Promise.resolve({ id }) }
    const url = `http://localhost:3000/api/media/${id}`

    const get = await GET(new Request(url), context)
    const head = await HEAD(new Request(url, { method: 'HEAD' }), context)

    expect(get.status).toBe(404)
    expect(head.status).toBe(404)
  })
})
