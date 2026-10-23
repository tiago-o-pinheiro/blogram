import * as Models from '@/models/models'

export const toImageSrc = (image: Models.PostImage, minWidth: number): string => {
  const variant = [...image.variants]
    .sort((a, b) => a.width - b.width)
    .find((candidate) => candidate.width >= minWidth)
  const base = `${Models.MEDIA_PATH}/${image.id}`
  return variant ? `${base}?variant=${variant.name}` : base
}
