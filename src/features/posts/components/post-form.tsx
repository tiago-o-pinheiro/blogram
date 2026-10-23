'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { Select } from '@/design-system/ui/select'
import { Textarea } from '@/design-system/ui/textarea'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { LinkFields, type LinkFieldsValue } from './link-fields'
import { ACCEPTED_IMAGE_TYPES, PhotoFields } from './photo-fields'
import {
  createPost,
  fetchLinkMetadata,
  PostsApiError,
  replacePostImage,
  replacePostVideo,
  updatePost,
} from '../api/posts-api'
import { toImageSrc } from '../lib/to-image-src'
import { toPostsMessageKey } from '../lib/to-posts-message'

type PostFormProps = {
  post?: Models.Post
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

const toPreviewSrc = (post: Models.Post | undefined): string | null =>
  post?.image ? toImageSrc(post.image, 960) : null

export const PostForm = ({ post }: PostFormProps) => {
  const t = useT()
  const router = useRouter()
  const isEdit = post !== undefined
  const [postType, setPostType] = useState<Models.PostType>(post?.type ?? 'photo')
  const [text, setText] = useState(post?.text ?? '')
  const [altText, setAltText] = useState(post?.image?.altText ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [poster, setPoster] = useState<File | null>(null)
  const [link, setLink] = useState<LinkFieldsValue>({
    url: post?.link?.url ?? post?.youtube?.url ?? '',
    title: post?.link?.title ?? '',
    description: post?.link?.description ?? '',
    source: post?.link?.source ?? '',
  })
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [hasMetadataError, setHasMetadataError] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [statusKey, setStatusKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)
  const objectUrlRef = useRef<string | null>(null)
  const isLink = postType === 'link' || postType === 'news'

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

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    },
    [],
  )

  const replaceObjectUrl = (nextUrl: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    objectUrlRef.current = nextUrl
    setLocalPreviewUrl(nextUrl)
  }

  const reportFailure = (error: unknown) => {
    setErrorKey(
      error instanceof PostsApiError ? toPostsMessageKey(error.status) : 'posts.error.generic',
    )
  }

  const handleReplace = async (nextFile: File) => {
    if (!post) {
      return
    }
    setIsPending(true)
    try {
      await replacePostImage(post.id, nextFile)
    } catch (error) {
      setIsPending(false)
      reportFailure(error)
      return
    }
    setIsPending(false)
    setStatusKey('postForm.replaced')
    router.refresh()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    setStatusKey(null)
    if (!nextFile) {
      if (postType === 'video') {
        setPoster(null)
      } else {
        setFile(null)
      }
      replaceObjectUrl(null)
      return
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(nextFile.type) || nextFile.size > MAX_IMAGE_BYTES) {
      event.target.value = ''
      if (postType === 'video') {
        setPoster(null)
      } else {
        setFile(null)
      }
      replaceObjectUrl(null)
      setErrorKey(
        ACCEPTED_IMAGE_TYPES.includes(nextFile.type)
          ? 'posts.error.tooLarge'
          : 'postForm.error.imageType',
      )
      return
    }
    setErrorKey(null)
    if (isEdit) {
      void handleReplace(nextFile)
      return
    }
    if (postType === 'video') {
      setPoster(nextFile)
    } else {
      setFile(nextFile)
    }
    replaceObjectUrl(URL.createObjectURL(nextFile))
  }

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    if (nextFile && !ACCEPTED_VIDEO_TYPES.includes(nextFile.type)) {
      event.target.value = ''
      setFile(null)
      setErrorKey('postForm.error.videoType')
      return
    }
    setErrorKey(null)
    setStatusKey(null)
    if (post && nextFile) {
      setIsPending(true)
      void replacePostVideo(post.id, nextFile)
        .then(() => {
          setStatusKey('postForm.videoReplaced')
          router.refresh()
        })
        .catch(reportFailure)
        .finally(() => setIsPending(false))
      return
    }
    setFile(nextFile)
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
          ...(file ? { file } : {}),
          ...(poster ? { poster } : {}),
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
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      {!isEdit ? (
        <Select
          label={t('postForm.type')}
          name="type"
          value={postType}
          disabled={isPending}
          onChange={(event) => {
            const nextType = Models.POST_TYPES.find((type) => type === event.target.value)
            if (nextType) {
              setPostType(nextType)
              setFile(null)
              setPoster(null)
              replaceObjectUrl(null)
              setErrorKey(null)
              setStatusKey(null)
            }
          }}
        >
          {Models.POST_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`posts.type.${type}`)}
            </option>
          ))}
        </Select>
      ) : null}
      {postType === 'photo' ? (
        <PhotoFields
          text={text}
          altText={altText}
          previewSrc={localPreviewUrl ?? toPreviewSrc(post)}
          isEdit={isEdit}
          isDisabled={isPending}
          onTextChange={(value) => {
            setStatusKey(null)
            setText(value)
          }}
          onAltTextChange={(value) => {
            setStatusKey(null)
            setAltText(value)
          }}
          onFileChange={handleFileChange}
        />
      ) : (
        <>
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
          {postType === 'video' ? (
            <Field
              label={t('postForm.video')}
              name="file"
              type="file"
              accept={ACCEPTED_VIDEO_TYPES.join(',')}
              disabled={isPending}
              onChange={handleVideoChange}
            />
          ) : null}
          {postType !== 'youtube' ? (
            <>
              {(localPreviewUrl ?? toPreviewSrc(post)) ? (
                <Image
                  unoptimized
                  width={post?.image?.width ?? 960}
                  height={post?.image?.height ?? 960}
                  src={localPreviewUrl ?? toPreviewSrc(post) ?? ''}
                  alt={altText}
                  className="max-h-96 w-full rounded-md object-contain"
                />
              ) : null}
              <Field
                label={t(postType === 'video' ? 'postForm.poster' : 'postForm.cover')}
                name="poster"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                disabled={isPending}
                onChange={handleFileChange}
              />
              <Field
                label={t('postForm.altText')}
                name="altText"
                value={altText}
                maxLength={Models.ALT_TEXT_MAX}
                disabled={isPending}
                onChange={(event) => setAltText(event.target.value)}
              />
            </>
          ) : null}
          <Textarea
            label={t('postForm.text')}
            name="text"
            value={text}
            maxLength={Models.POST_TEXT_MAX}
            rows={4}
            disabled={isPending}
            onChange={(event) => setText(event.target.value)}
          />
        </>
      )}
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
    </form>
  )
}
