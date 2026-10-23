'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { cn } from '@/design-system/ui/lib/cn'
import { type MediaSelection } from '@/design-system/ui/media-input'
import { Textarea } from '@/design-system/ui/textarea'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { LinkFields, type LinkFieldsValue } from './link-fields'
import { PostMediaFields } from './post-media-fields'
import { PostTypePicker } from './post-type-picker'
import {
  createPost,
  fetchLinkMetadata,
  PostsApiError,
  replacePostImage,
  replacePostVideo,
  updatePost,
} from '../api/posts-api'
import { toPostsMessageKey } from '../lib/to-posts-message'

type PostFormProps = {
  post?: Models.Post
  maxImageBytes: number
  maxVideoBytes: number
}

type Replacement = {
  upload: (id: string, file: File) => Promise<Models.Post>
  successKey: TranslationKey
}

const IMAGE_REPLACEMENT: Replacement = { upload: replacePostImage, successKey: 'postForm.replaced' }

const VIDEO_REPLACEMENT: Replacement = {
  upload: replacePostVideo,
  successKey: 'postForm.videoReplaced',
}

export const PostForm = ({ post, maxImageBytes, maxVideoBytes }: PostFormProps) => {
  const t = useT()
  const router = useRouter()
  const isEdit = post !== undefined
  const [postType, setPostType] = useState<Models.PostType>(post?.type ?? 'photo')
  const [text, setText] = useState(post?.text ?? '')
  const [altText, setAltText] = useState(post?.image?.altText ?? '')
  const [file, setFile] = useState<MediaSelection | null>(null)
  const [poster, setPoster] = useState<MediaSelection | null>(null)
  const [link, setLink] = useState<LinkFieldsValue>({
    url: post?.link?.url ?? post?.youtube?.url ?? '',
    title: post?.link?.title ?? '',
    description: post?.link?.description ?? '',
    source: post?.link?.source ?? '',
  })
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [hasMetadataError, setHasMetadataError] = useState(false)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [statusKey, setStatusKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)
  const fileMediaId = postType === 'video' ? post?.video?.id : post?.image?.id
  const posterMediaId = post?.image?.id
  const [previousFileMediaId, setPreviousFileMediaId] = useState(fileMediaId)
  const [previousPosterMediaId, setPreviousPosterMediaId] = useState(posterMediaId)
  const isLink = postType === 'link' || postType === 'news'
  const hasMedia = postType !== 'youtube'

  if (fileMediaId !== previousFileMediaId) {
    setPreviousFileMediaId(fileMediaId)
    setFile(null)
  }
  if (posterMediaId !== previousPosterMediaId) {
    setPreviousPosterMediaId(posterMediaId)
    setPoster(null)
  }

  const handleMetadata = async () => {
    setIsFetchingMetadata(true)
    setHasMetadataError(false)
    try {
      const metadata = await fetchLinkMetadata(link.url)
      setHasMetadataError(!metadata.title)
      setLink((currentLink) =>
        currentLink.url !== link.url
          ? currentLink
          : {
              ...metadata,
              title: currentLink.title || metadata.title,
              description: currentLink.description || metadata.description,
              source: currentLink.source || metadata.source,
            },
      )
    } catch {
      setHasMetadataError(true)
    } finally {
      setIsFetchingMetadata(false)
    }
  }

  const reportFailure = (error: unknown) => {
    setErrorKey(
      error instanceof PostsApiError ? toPostsMessageKey(error.status) : 'posts.error.generic',
    )
  }

  const handleTypeChange = (nextType: Models.PostType) => {
    setPostType(nextType)
    setFile(null)
    setPoster(null)
    setErrorKey(null)
    setStatusKey(null)
  }

  const handleReplace = async (
    id: string,
    selection: MediaSelection,
    replacement: Replacement,
    clearSelection: () => void,
  ) => {
    setIsPending(true)
    try {
      await replacement.upload(id, selection.file)
      setStatusKey(replacement.successKey)
      router.refresh()
    } catch (error) {
      reportFailure(error)
      clearSelection()
    } finally {
      setIsPending(false)
    }
  }

  const handleSelection = (
    selection: MediaSelection | null,
    setSelection: (nextSelection: MediaSelection | null) => void,
    replacement: Replacement,
  ) => {
    setErrorKey(null)
    setStatusKey(null)
    setSelection(selection)
    if (post && selection) {
      void handleReplace(post.id, selection, replacement, () => setSelection(null))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorKey(null)
    setStatusKey(null)
    setIsPending(true)
    try {
      if (post) {
        await updatePost(post.id, {
          text,
          altText,
          ...(isLink ? link : {}),
          ...(postType === 'youtube' ? { url: link.url } : {}),
        })
      } else {
        const draft = await createPost({
          type: postType,
          text,
          altText,
          ...(file ? { file: file.file } : {}),
          ...(poster ? { poster: poster.file } : {}),
          ...(isLink ? link : {}),
          ...(postType === 'youtube' ? { url: link.url } : {}),
        })
        router.push(`/admin/posts/${draft.id}`)
        return
      }
    } catch (error) {
      setIsPending(false)
      reportFailure(error)
      return
    }
    setIsPending(false)
    setStatusKey('postForm.saved')
    router.refresh()
  }

  const isFileMissing =
    !isEdit &&
    ((postType === 'photo' && file === null) ||
      (postType === 'video' && (file === null || poster === null)))
  const isUrlMissing = (isLink || postType === 'youtube') && !link.url.trim()

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-6 rounded-2xl border border-border/20 bg-card p-4 sm:p-6"
    >
      {!isEdit ? (
        <PostTypePicker
          legend={t('postForm.typeLegend')}
          value={postType}
          isDisabled={isPending}
          onChange={handleTypeChange}
        />
      ) : null}
      <div className={cn('grid gap-6 lg:items-start', hasMedia && 'lg:grid-cols-2')}>
        {hasMedia ? (
          <PostMediaFields
            key={postType}
            postType={postType}
            post={post}
            file={file}
            poster={poster}
            altText={altText}
            isDisabled={isPending}
            maxImageBytes={maxImageBytes}
            maxVideoBytes={maxVideoBytes}
            onFileChange={(selection) =>
              handleSelection(
                selection,
                setFile,
                postType === 'video' ? VIDEO_REPLACEMENT : IMAGE_REPLACEMENT,
              )
            }
            onPosterChange={(selection) => handleSelection(selection, setPoster, IMAGE_REPLACEMENT)}
          />
        ) : null}
        <div className={cn('flex flex-col gap-4', !hasMedia && 'max-w-2xl')}>
          {postType === 'youtube' ? (
            <Field
              label={t('postForm.youtubeUrl')}
              name="url"
              type="url"
              required
              value={link.url}
              disabled={isPending}
              onChange={(event) => setLink({ ...link, url: event.target.value })}
            />
          ) : null}
          {isLink ? (
            <LinkFields
              value={link}
              isDisabled={isPending}
              isFetching={isFetchingMetadata}
              hasMetadataError={hasMetadataError}
              onChange={setLink}
              onFetchMetadata={() => void handleMetadata()}
            />
          ) : null}
          {hasMedia ? (
            <Field
              label={t('postForm.altText')}
              name="altText"
              value={altText}
              maxLength={Models.ALT_TEXT_MAX}
              disabled={isPending}
              autoComplete="off"
              onChange={(event) => {
                setStatusKey(null)
                setAltText(event.target.value)
              }}
            />
          ) : null}
          {postType === 'photo' && altText.trim().length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('postForm.altTextHint')}</p>
          ) : null}
          <Textarea
            label={t('postForm.text')}
            name="text"
            value={text}
            maxLength={Models.POST_TEXT_MAX}
            rows={4}
            disabled={isPending}
            onChange={(event) => {
              setStatusKey(null)
              setText(event.target.value)
            }}
          />
        </div>
      </div>
      {errorKey ? (
        <p role="alert" className="text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      {statusKey ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t(statusKey)}
        </p>
      ) : null}
      <div className="flex justify-end border-t border-border/20 pt-6">
        <Button
          type="submit"
          disabled={
            isFileMissing || isUrlMissing || (isLink && !link.title.trim()) || isFetchingMetadata
          }
          isLoading={isPending}
          loadingLabel={isEdit ? t('postForm.saving') : t('postForm.creating')}
        >
          {isEdit ? t('postForm.save') : t('postForm.create')}
        </Button>
      </div>
    </form>
  )
}
