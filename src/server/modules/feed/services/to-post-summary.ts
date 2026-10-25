import { Models } from '@/models'

const SUMMARY_TITLE_GRAPHEMES = 80
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export const toPostSummaryTitle = (record: Models.Post): string => {
  const title = Models.toPostTitle(record)
  if (title) {
    return title
  }
  return Array.from(segmenter.segment(record.text.replace(/\s+/g, ' ').trim()))
    .slice(0, SUMMARY_TITLE_GRAPHEMES)
    .map((part) => part.segment)
    .join('')
    .trim()
}

export const toPostSummary = (record: Models.Post): Models.PostSummary => ({
  id: record.id,
  type: record.type,
  title: toPostSummaryTitle(record),
  publishedAt: record.publishedAt ?? record.createdAt,
  image: record.image
    ? { id: record.image.id, width: record.image.width, height: record.image.height }
    : null,
})
