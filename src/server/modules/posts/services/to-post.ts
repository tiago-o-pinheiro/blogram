import { Value } from 'typebox/value'

import { Models } from '@/models'

import { type media } from '@/server/modules/media/schemas/media.table'
import { type post } from '@/server/modules/posts/schemas/post.table'

type PostRecord = {
  post: typeof post.$inferSelect
  media: typeof media.$inferSelect | null
  video?: typeof media.$inferSelect | null
}

const toImageExtras = (metadata: typeof media.$inferSelect.metadata) => ({
  ...(Value.Check(Models.PostCamera, metadata.camera) ? { camera: metadata.camera } : {}),
  ...(typeof metadata.placeholder === 'string' &&
  Value.Check(Models.PostImage.properties.placeholder, metadata.placeholder)
    ? { placeholder: metadata.placeholder }
    : {}),
})

export const toPost = ({ post: row, media: image, video }: PostRecord): Models.Post => ({
  id: row.publicId,
  type: row.type,
  status: row.status,
  ...(row.title ? { title: row.title } : {}),
  text: row.text,
  likes: row.likes,
  ...(Value.Check(Models.PostPlace, row.place) ? { place: row.place } : {}),
  publishedAt: row.publishedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  image: image
    ? {
        id: image.id,
        width: image.width,
        height: image.height,
        altText: image.altText,
        ...toImageExtras(image.metadata),
        variants: image.variants.flatMap((variant) => {
          const name = Models.IMAGE_VARIANT_NAMES.find((candidate) => candidate === variant.name)
          return name ? [{ name, width: variant.width, height: variant.height }] : []
        }),
      }
    : null,
  ...(video && (video.contentType === 'video/mp4' || video.contentType === 'video/webm')
    ? {
        video: {
          id: video.id,
          width: video.width,
          height: video.height,
          contentType: video.contentType,
        },
      }
    : {}),
  ...(row.type === 'youtube' && Value.Check(Models.PostYoutube, row.details)
    ? { youtube: row.details }
    : {}),
  ...((row.type === 'link' || row.type === 'news') && Value.Check(Models.PostLink, row.details)
    ? { link: row.details }
    : {}),
})
