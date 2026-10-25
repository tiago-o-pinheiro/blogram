import { Models } from '@/models'

import { NotFoundError } from '@/server/errors/http-errors'
import { feedService } from '@/server/modules/feed/services/feed.service'
import { toPostSummaryTitle } from '@/server/modules/feed/services/to-post-summary'
import { installationService } from '@/server/modules/installation/services/installation.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

const RSS_ITEM_LIMIT = 20

const escapeXml = (text: string): string =>
  [...text]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0
      return code >= 32 || code === 9 || code === 10 || code === 13
    })
    .join('')
    .replace(/[<>&"']/g, (character) => {
      const escaped: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      }
      return escaped[character] ?? ''
    })

const toItem = (post: Models.Post, origin: string, fallback: string): string => {
  const permalink = `${origin}/posts/${post.id}`
  const image = post.image
    ? `<img src="${escapeXml(`${origin}${Models.MEDIA_PATH}/${post.image.id}?variant=w960`)}" alt="${escapeXml(post.image.altText)}" />`
    : ''
  const caption = post.text ? `<p>${escapeXml(post.text)}</p>` : ''
  const publishedAt = new Date(post.publishedAt ?? post.createdAt).toUTCString()
  return `<item><title>${escapeXml(toPostSummaryTitle(post) || fallback)}</title><link>${escapeXml(permalink)}</link><guid isPermaLink="true">${escapeXml(permalink)}</guid><pubDate>${publishedAt}</pubDate><description>${escapeXml(`${image}${caption}`)}</description></item>`
}

export class RssService {
  render = async (origin: string): Promise<string> => {
    if ((await installationService.getStatus()) !== 'completed') {
      throw new NotFoundError('Feed not found')
    }
    const [profile, settings, page] = await Promise.all([
      profileService.getProfile(),
      profileService.getSettings(),
      feedService.list({ page: 1, pageSize: RSS_ITEM_LIMIT }),
    ])
    const title = profile?.name || new URL(origin).host
    const description = profile?.description || 'A personal multimedia journal'
    const items = page.data.map((post) => toItem(post, origin, title)).join('')
    return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(title)}</title><link>${escapeXml(origin)}</link><description>${escapeXml(description)}</description><language>${settings.defaultLocale}</language>${items}</channel></rss>`
  }
}

export const rssService = new RssService()
