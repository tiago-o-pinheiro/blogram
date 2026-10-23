'use client'

import { type MediaSelection } from '@/design-system/ui/media-input'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { MediaField } from '@/components/media-field'

import { toImageSrc } from '../lib/to-image-src'

type PostMediaFieldsProps = {
  postType: Models.PostType
  post?: Models.Post
  file: MediaSelection | null
  poster: MediaSelection | null
  altText: string
  isDisabled: boolean
  maxImageBytes: number
  maxVideoBytes: number
  onFileChange: (selection: MediaSelection | null) => void
  onPosterChange: (selection: MediaSelection | null) => void
}

export const PostMediaFields = ({
  postType,
  post,
  file,
  poster,
  altText,
  isDisabled,
  maxImageBytes,
  maxVideoBytes,
  onFileChange,
  onPosterChange,
}: PostMediaFieldsProps) => {
  const t = useT()
  const imageAlt = altText || t('postForm.previewAlt')
  const savedImageSrc = post?.image ? toImageSrc(post.image, 960) : null

  if (postType === 'photo') {
    return (
      <MediaField
        name="file"
        label={t('postForm.photo')}
        kind="photo"
        maxBytes={maxImageBytes}
        value={file}
        savedSrc={savedImageSrc}
        alt={imageAlt}
        isDisabled={isDisabled}
        onChange={onFileChange}
      />
    )
  }
  if (postType === 'video') {
    return (
      <div className="flex flex-col gap-6">
        <MediaField
          name="file"
          label={t('postForm.video')}
          kind="video"
          maxBytes={maxVideoBytes}
          value={file}
          savedSrc={post?.video ? `${Models.MEDIA_PATH}/${post.video.id}` : null}
          isDisabled={isDisabled}
          onChange={onFileChange}
        />
        <MediaField
          name="poster"
          label={t('postForm.poster')}
          kind="image"
          maxBytes={maxImageBytes}
          value={poster}
          savedSrc={savedImageSrc}
          alt={imageAlt}
          isDisabled={isDisabled}
          onChange={onPosterChange}
        />
      </div>
    )
  }
  if (postType === 'youtube') {
    return null
  }
  return (
    <MediaField
      name="poster"
      label={t('postForm.cover')}
      kind="image"
      maxBytes={maxImageBytes}
      value={file}
      savedSrc={savedImageSrc}
      alt={imageAlt}
      isDisabled={isDisabled}
      onChange={onFileChange}
    />
  )
}
