import { type Models } from '@/models'

import { ValidationError } from '@/server/errors/http-errors'

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export const normalizeWebUrl = (input: string): URL => {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new ValidationError('A valid HTTP or HTTPS URL is required')
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    input.length > 2048
  ) {
    throw new ValidationError('A valid HTTP or HTTPS URL is required')
  }
  url.hash = ''
  return url
}

export const normalizeYoutubeUrl = (input: string): Models.PostYoutube => {
  const url = normalizeWebUrl(input)
  const segments = url.pathname.split('/').filter(Boolean)
  let videoId: string | undefined
  if ((url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') && segments.length === 1) {
    videoId = segments[0]
  } else if (YOUTUBE_HOSTS.includes(url.hostname)) {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') ?? undefined
    } else if (segments.length === 2 && ['embed', 'shorts', 'live'].includes(segments[0] ?? '')) {
      videoId = segments[1]
    }
  }
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId) || url.port) {
    throw new ValidationError('A supported YouTube video URL is required')
  }
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}
