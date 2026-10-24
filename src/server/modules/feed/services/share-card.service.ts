import sharp from 'sharp'

import { SHARE_CARD } from '@/design-system/tokens/share-card'
import { Models } from '@/models'

import { env } from '@/server/config/env'
import { feedService } from '@/server/modules/feed/services/feed.service'
import { postService } from '@/server/modules/posts/services/post.service'
import { profileService } from '@/server/modules/profile/services/profile.service'

const MAX_THUMBNAIL_BYTES = 2097152
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

const toGraphemes = (text: string) => [...segmenter.segment(text)].map((part) => part.segment)

const escapeXml = (text: string): string =>
  [...text]
    .filter((character) => (character.codePointAt(0) ?? 0) >= 32)
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

export const wrapCardText = (text: string, length: number, maxLines: number): string[] => {
  let characters = toGraphemes(text.replace(/\s+/g, ' ').trim())
  const lines: string[] = []
  while (characters.length > 0 && lines.length < maxLines) {
    let units = 0
    let end = 0
    for (const character of characters) {
      const width = [...character].some((point) => (point.codePointAt(0) ?? 0) > 591) ? 2 : 1
      if (units + width > length) {
        break
      }
      units += width
      end += 1
    }
    const lastSpace = characters.slice(0, end).lastIndexOf(' ')
    if (end < characters.length && lastSpace > 0) {
      end = lastSpace
    }
    lines.push(characters.slice(0, Math.max(end, 1)).join('').trim())
    characters = toGraphemes(characters.slice(Math.max(end, 1)).join('').trim())
  }
  if (characters.length > 0) {
    const last = toGraphemes(lines[maxLines - 1] ?? '')
    lines[maxLines - 1] = `${last.slice(0, -1).join('')}…`
  }
  return lines
}

const readYoutubeThumbnail = async (videoId: string): Promise<Uint8Array | null> => {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return null
  }
  try {
    const response = await fetch(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, {
      redirect: 'error',
      signal: AbortSignal.timeout(3000),
    })
    if (
      !response.ok ||
      !response.body ||
      Number(response.headers.get('content-length')) > MAX_THUMBNAIL_BYTES
    ) {
      await response.body?.cancel()
      return null
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let bytes = 0
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) {
          break
        }
        bytes += chunk.value.byteLength
        if (bytes > MAX_THUMBNAIL_BYTES) {
          await reader.cancel()
          return null
        }
        chunks.push(chunk.value)
      }
    } finally {
      reader.releaseLock()
    }
    return new Uint8Array(Buffer.concat(chunks))
  } catch {
    return null
  }
}

const readCover = async (post: Models.Post): Promise<Uint8Array | null> => {
  if (post.image) {
    return (await postService.readMedia(post.image.id, { isOwner: false })).object.body
  }
  return post.youtube ? readYoutubeThumbnail(post.youtube.videoId) : null
}

export class ShareCardService {
  render = async (id: string, format: 'story' | 'og'): Promise<Uint8Array> => {
    const post = await feedService.get(id)
    const profile = await profileService.getProfile()
    const layout = SHARE_CARD[format]
    const domain = new URL(env.BETTER_AUTH_URL).host
    const title = Models.toPostTitle(post) || post.text || profile?.name || domain
    const owner = wrapCardText(profile?.name || domain, format === 'story' ? 38 : 29, 1)[0] ?? ''
    const titleX = format === 'story' ? layout.inset : 600
    const lines = wrapCardText(title, layout.lineLength, layout.maxLines)
    const excerpt = Models.toPostTitle(post) && post.text ? wrapCardText(post.text, 40, 2) : []
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
      <rect width="100%" height="100%" fill="${SHARE_CARD.background}"/>
      <g font-family="${SHARE_CARD.font}" fill="${SHARE_CARD.foreground}">
        <text x="${titleX}" y="${format === 'story' ? 130 : 105}" font-size="${format === 'story' ? 36 : 28}" font-weight="bold">${escapeXml(owner)}</text>
        <text x="${titleX}" y="${format === 'story' ? 190 : 150}" font-size="${format === 'story' ? 25 : 20}" fill="${SHARE_CARD.secondary}">${escapeXml(wrapCardText(domain, format === 'story' ? 52 : 38, 1)[0] ?? '')}</text>
        ${lines.map((line, index) => `<text x="${titleX}" y="${layout.textTop + index * layout.lineHeight}" font-size="${layout.titleSize}" font-weight="bold">${escapeXml(line)}</text>`).join('')}
        ${format === 'story' ? excerpt.map((line, index) => `<text x="${layout.inset}" y="${1780 + index * 40}" font-size="28" fill="${SHARE_CARD.secondary}">${escapeXml(line)}</text>`).join('') : ''}
        <text x="${titleX}" y="${layout.height - 50}" font-size="${format === 'story' ? 22 : 16}" fill="${SHARE_CARD.secondary}">${escapeXml(wrapCardText(`${domain}/posts/${id}`, format === 'story' ? 64 : 50, 1)[0] ?? '')}</text>
      </g>
    </svg>`
    const cover = await readCover(post)
    const overlay = cover
      ? await sharp(cover, { limitInputPixels: 50000000 })
          .rotate()
          .resize(layout.imageWidth, layout.imageHeight, {
            fit: 'contain',
            background: SHARE_CARD.background,
          })
          .png()
          .toBuffer()
          .catch(() => null)
      : null
    const composite = overlay ? [{ input: overlay, left: layout.inset, top: layout.imageTop }] : []
    return new Uint8Array(await sharp(Buffer.from(svg)).composite(composite).png().toBuffer())
  }
}

export const shareCardService = new ShareCardService()
