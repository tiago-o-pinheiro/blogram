'use client'

import { Check, EyeOff, Save, Send } from 'lucide-react'
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
import { PlaceFields } from './place-fields'
import { PostMediaFields } from './post-media-fields'
import { PostTypePicker } from './post-type-picker'
import {
  createPost,
  fetchLinkMetadata,
  PostsApiError,
  replacePostImage,
  replacePostVideo,
  setPostStatus,
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
  media: 'image' | 'video'
}

type Intent = 'save' | 'publish' | 'unpublish'

type LinkDraft = {
  fields: LinkFieldsValue
  manual: Record<'title' | 'description' | 'source', boolean>
}

const IMAGE_REPLACEMENT: Replacement = {
  upload: replacePostImage,
  successKey: 'postForm.replaced',
  media: 'image',
}

const VIDEO_REPLACEMENT: Replacement = {
  upload: replacePostVideo,
  successKey: 'postForm.videoReplaced',
  media: 'video',
}

export const PostForm = ({ post, maxImageBytes, maxVideoBytes }: PostFormProps) => {
  const t = useT()
  const router = useRouter()
  const isEdit = post !== undefined
  const [postType, setPostType] = useState<Models.PostType>(post?.type ?? 'photo')
  const [place, setPlace] = useState<Models.PostPlace | null>(post?.place ?? null)
  const [title, setTitle] = useState(post?.title ?? '')
  const [text, setText] = useState(post?.text ?? '')
  const [altText, setAltText] = useState(post?.image?.altText ?? '')
  const [file, setFile] = useState<MediaSelection | null>(null)
  const [poster, setPoster] = useState<MediaSelection | null>(null)
  const [linkDraft, setLinkDraft] = useState<LinkDraft>({
    fields: {
      url: post?.link?.url ?? post?.youtube?.url ?? '',
      title: post?.link?.title ?? '',
      description: post?.link?.description ?? '',
      source: post?.link?.source ?? '',
    },
    manual: {
      title: post?.link !== undefined,
      description: post?.link !== undefined,
      source: post?.link !== undefined,
    },
  })
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [hasMetadataError, setHasMetadataError] = useState(false)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [statusKey, setStatusKey] = useState<TranslationKey | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [intent, setIntent] = useState<Intent>('save')
  const [savedImage, setSavedImage] = useState(post?.image ?? null)
  const [savedVideo, setSavedVideo] = useState(post?.video)
  const [previousImageId, setPreviousImageId] = useState(post?.image?.id)
  const [previousVideoId, setPreviousVideoId] = useState(post?.video?.id)
  const link = linkDraft.fields
  const mediaPost = post ? { ...post, image: savedImage, video: savedVideo } : undefined
  const isLink = postType === 'link' || postType === 'news'
  const hasMedia = postType !== 'youtube'

  if (post?.image?.id !== previousImageId) {
    setPreviousImageId(post?.image?.id)
    setSavedImage(post?.image ?? null)
    if (postType !== 'video') {
      setFile(null)
    }
    setPoster(null)
  }
  if (post?.video?.id !== previousVideoId) {
    setPreviousVideoId(post?.video?.id)
    setSavedVideo(post?.video)
    if (postType === 'video') {
      setFile(null)
    }
  }

  const handleLinkChange = (fields: LinkFieldsValue) => {
    setLinkDraft((currentDraft) => ({
      fields,
      manual: {
        title: currentDraft.manual.title || fields.title !== currentDraft.fields.title,
        description:
          currentDraft.manual.description || fields.description !== currentDraft.fields.description,
        source: currentDraft.manual.source || fields.source !== currentDraft.fields.source,
      },
    }))
  }

  const handleMetadata = async () => {
    setIsFetchingMetadata(true)
    setHasMetadataError(false)
    try {
      const metadata = await fetchLinkMetadata(link.url)
      setHasMetadataError(!metadata.title)
      setLinkDraft((currentDraft) =>
        currentDraft.fields.url !== link.url
          ? currentDraft
          : {
              manual: currentDraft.manual,
              fields: {
                ...metadata,
                title: currentDraft.manual.title ? currentDraft.fields.title : metadata.title,
                description: currentDraft.manual.description
                  ? currentDraft.fields.description
                  : metadata.description,
                source: currentDraft.manual.source ? currentDraft.fields.source : metadata.source,
              },
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
      const savedPost = await replacement.upload(id, selection.file)
      if (replacement.media === 'image') {
        setSavedImage(savedPost.image)
      } else {
        setSavedVideo(savedPost.video)
      }
      clearSelection()
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

  const handleUnpublish = async (id: string) => {
    setErrorKey(null)
    setStatusKey(null)
    setIntent('unpublish')
    setIsPending(true)
    try {
      await setPostStatus(id, 'draft')
    } catch (error) {
      setIsPending(false)
      reportFailure(error)
      return
    }
    setIsPending(false)
    setStatusKey('postForm.unpublished')
    router.refresh()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submitter = 'submitter' in event.nativeEvent ? event.nativeEvent.submitter : null
    const shouldPublish = submitter instanceof HTMLButtonElement && submitter.value === 'publish'
    setErrorKey(null)
    setStatusKey(null)
    setIntent(shouldPublish ? 'publish' : 'save')
    setIsPending(true)
    try {
      if (post) {
        await updatePost(post.id, {
          text,
          place,
          altText,
          ...(isLink ? link : { title }),
          ...(postType === 'youtube' ? { url: link.url } : {}),
        })
        if (shouldPublish) {
          await setPostStatus(post.id, 'published')
        }
      } else {
        const draft = await createPost({
          type: postType,
          text,
          ...(place ? { place } : {}),
          altText,
          ...(file ? { file: file.file } : {}),
          ...(poster ? { poster: poster.file } : {}),
          ...(isLink ? link : { title }),
          ...(postType === 'youtube' ? { url: link.url } : {}),
        })
        try {
          if (shouldPublish) {
            await setPostStatus(draft.id, 'published')
          }
        } finally {
          router.push(`/admin/posts/${draft.id}`)
        }
        return
      }
    } catch (error) {
      setIsPending(false)
      reportFailure(error)
      return
    }
    setIsPending(false)
    setStatusKey(shouldPublish ? 'postForm.published' : 'postForm.saved')
    router.refresh()
  }

  const isFileMissing =
    !isEdit &&
    ((postType === 'photo' && file === null) ||
      (postType === 'video' && (file === null || poster === null)))
  const isUrlMissing = (isLink || postType === 'youtube') && !link.url.trim()
  const isIncomplete =
    isFileMissing || isUrlMissing || (isLink && !link.title.trim()) || isFetchingMetadata

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-6 rounded-xl border border-line bg-card p-4 sm:p-6"
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
          <div key={`media-${postType}`} className="min-w-0 animate-rise-in">
            <PostMediaFields
              postType={postType}
              post={mediaPost}
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
              onPosterChange={(selection) =>
                handleSelection(selection, setPoster, IMAGE_REPLACEMENT)
              }
            />
          </div>
        ) : null}
        <div
          key={`fields-${postType}`}
          className={cn('flex flex-col gap-4 stagger *:animate-rise-in', !hasMedia && 'max-w-2xl')}
        >
          {postType === 'youtube' ? (
            <Field
              label={t('postForm.youtubeUrl')}
              name="url"
              type="url"
              required
              value={link.url}
              disabled={isPending}
              onChange={(event) => handleLinkChange({ ...link, url: event.target.value })}
            />
          ) : null}
          {isLink ? null : (
            <Field
              label={t('postForm.postTitle')}
              name="title"
              value={title}
              maxLength={Models.POST_TITLE_MAX}
              disabled={isPending}
              autoComplete="off"
              onChange={(event) => {
                setStatusKey(null)
                setTitle(event.target.value)
              }}
            />
          )}
          {isLink ? (
            <LinkFields
              value={link}
              isDisabled={isPending}
              isFetching={isFetchingMetadata}
              hasMetadataError={hasMetadataError}
              onChange={handleLinkChange}
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
          <PlaceFields value={place} onChange={setPlace} isDisabled={isPending} />
        </div>
      </div>
      <div className="pointer-events-none sticky bottom-admin-dock z-10 flex flex-col items-end gap-2 md:bottom-6">
        {errorKey ? (
          <p
            role="alert"
            key={errorKey}
            className="animate-rise-in rounded-full glass px-4 py-2 text-sm text-danger"
          >
            {t(errorKey)}
          </p>
        ) : null}
        {statusKey ? (
          <p
            role="status"
            key={statusKey}
            className="animate-rise-in rounded-full glass px-4 py-2 text-sm text-muted-foreground"
          >
            {t(statusKey)}
          </p>
        ) : null}
        <div className="pointer-events-auto flex animate-rise-in gap-2 rounded-full glass p-1.5">
          {post?.status === 'published' ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t('postForm.unpublish')}
                title={t('postForm.unpublish')}
                disabled={isPending}
                isLoading={isPending && intent === 'unpublish'}
                loadingLabel={t('postForm.unpublishing')}
                onClick={() => void handleUnpublish(post.id)}
              >
                <EyeOff aria-hidden="true" className="size-5" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="rounded-full"
                aria-label={t('postForm.save')}
                title={t('postForm.save')}
                disabled={isPending || isIncomplete}
                isLoading={isPending && intent === 'save'}
                loadingLabel={t('postForm.saving')}
              >
                <Check aria-hidden="true" className="size-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="submit"
                value="save"
                variant="secondary"
                size="icon"
                className="rounded-full"
                aria-label={t('postForm.create')}
                title={t('postForm.create')}
                disabled={isPending || isIncomplete}
                isLoading={isPending && intent === 'save'}
                loadingLabel={t('postForm.creating')}
              >
                <Save aria-hidden="true" className="size-5" />
              </Button>
              <Button
                type="submit"
                value="publish"
                size="icon"
                className="rounded-full"
                aria-label={t('postForm.publish')}
                title={t('postForm.publish')}
                disabled={isPending || isIncomplete}
                isLoading={isPending && intent === 'publish'}
                loadingLabel={t('postForm.publishing')}
              >
                <Send aria-hidden="true" className="size-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
