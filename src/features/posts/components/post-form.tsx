'use client'

import { Check, EyeOff, Save, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { Button } from '@/design-system/ui/button'
import { Field } from '@/design-system/ui/field'
import { cn } from '@/design-system/ui/lib/cn'
import { type MediaSelection } from '@/design-system/ui/media-input'
import { Progress } from '@/design-system/ui/progress'
import { Textarea } from '@/design-system/ui/textarea'
import { type TranslationKey } from '@/i18n'
import { useT } from '@/i18n/i18n-context'
import * as Models from '@/models/models'

import { AiApiError, requestAiDraft } from '@/features/ai/api/ai-api'
import { AiFieldButton } from '@/features/ai/components/ai-field-button'
import { AiPromptBar } from '@/features/ai/components/ai-prompt-bar'
import {
  type AiTarget,
  hasAiContext,
  toAiDraftRequest,
  toOfferedAiFields,
} from '@/features/ai/lib/to-ai-draft-request'

import { LinkFields, type LinkFieldsValue } from './link-fields'
import { PlaceFields } from './place-fields'
import { PostMediaFields } from './post-media-fields'
import { PostTypePicker } from './post-type-picker'
import {
  createPost,
  fetchLinkMetadata,
  replacePostImage,
  replacePostVideo,
  replacePostVideoFromUpload,
  setPostStatus,
  updatePost,
} from '../api/posts-api'
import { abortVideoUpload } from '../api/video-upload-api'
import { toPostsErrorKey } from '../lib/to-posts-message'
import { uploadVideoDirect } from '../lib/upload-video-parts'

type PostFormProps = {
  post?: Models.Post
  isAiEnabled?: boolean
  maxImageBytes: number
  maxVideoBytes: number
  videoUploadMode?: Models.VideoUploadMode
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

type AiValues = Record<Models.AiField, string>

type AiSnapshot = Partial<AiValues>

const AI_REASON_KEYS: Readonly<Record<string, TranslationKey>> = {
  auth: 'aiAssist.errors.auth',
  'rate-limit': 'aiAssist.errors.rateLimit',
  model: 'aiAssist.errors.model',
  unavailable: 'aiAssist.errors.unavailable',
  'invalid-response': 'aiAssist.errors.invalidResponse',
  'ai-not-configured': 'aiAssist.errors.notConfigured',
}

const toAiFailureKey = (error: unknown): TranslationKey => {
  if (!(error instanceof AiApiError)) {
    return 'aiAssist.errors.generic'
  }
  if (error.reason !== null && error.reason in AI_REASON_KEYS) {
    return AI_REASON_KEYS[error.reason] ?? 'aiAssist.errors.generic'
  }
  return error.status === 422 ? 'aiAssist.errors.invalid' : 'aiAssist.errors.generic'
}

const useAiDraft = () => {
  const [pendingTarget, setPendingTarget] = useState<AiTarget | null>(null)
  const [failureKey, setFailureKey] = useState<TranslationKey | null>(null)

  const generate = async (
    target: AiTarget,
    request: Parameters<typeof requestAiDraft>[0],
  ): Promise<Models.AiDraft | null> => {
    setFailureKey(null)
    setPendingTarget(target)
    try {
      return await requestAiDraft(request)
    } catch (error) {
      setFailureKey(toAiFailureKey(error))
      return null
    } finally {
      setPendingTarget(null)
    }
  }

  const resetFailure = () => setFailureKey(null)

  return { generate, pendingTarget, failureKey, resetFailure }
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

export const PostForm = ({
  post,
  isAiEnabled = false,
  maxImageBytes,
  maxVideoBytes,
  videoUploadMode = 'form',
}: PostFormProps) => {
  const t = useT()
  const { generate, pendingTarget, failureKey, resetFailure } = useAiDraft()
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiSnapshot, setAiSnapshot] = useState<AiSnapshot | null>(null)
  const [aiMessageKey, setAiMessageKey] = useState<TranslationKey | null>(null)
  const [aiRound, setAiRound] = useState(0)
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

  const aiValues: AiValues = { title: isLink ? link.title.trim() : title, altText, text }
  const aiFile = (postType === 'video' ? poster : file)?.file ?? null
  const aiMediaId = savedImage?.id
  const hasAiImage = aiFile !== null || aiMediaId !== undefined
  const offeredAiFields = toOfferedAiFields(postType, hasAiImage)
  const isAiBusy = isPending || pendingTarget !== null
  const hasContext = hasAiContext(aiPrompt, hasAiImage, aiValues)

  const handleAiGenerate = async (target: AiTarget) => {
    setAiMessageKey(null)
    const draft = await generate(
      target,
      toAiDraftRequest({
        target,
        prompt: aiPrompt,
        postType,
        values: aiValues,
        image: { file: aiFile, mediaId: aiMediaId },
      }),
    )
    if (draft === null) {
      return
    }
    const snapshot: AiSnapshot = {}
    if (draft.title !== undefined) {
      snapshot.title = title
      setTitle(draft.title)
    }
    if (draft.altText !== undefined) {
      snapshot.altText = altText
      setAltText(draft.altText)
    }
    if (draft.text !== undefined) {
      snapshot.text = text
      setText(draft.text)
    }
    setAiSnapshot(snapshot)
    setAiRound((round) => round + 1)
    setStatusKey(null)
    setAiMessageKey('aiAssist.applied')
  }

  const handleAiUndo = () => {
    if (aiSnapshot === null) {
      return
    }
    setTitle(aiSnapshot.title ?? title)
    setAltText(aiSnapshot.altText ?? altText)
    setText(aiSnapshot.text ?? text)
    setAiSnapshot(null)
    setAiRound((round) => round + 1)
    resetFailure()
    setAiMessageKey('aiAssist.undone')
  }

  const renderAiButton = (field: Models.AiField) => {
    if (!isAiEnabled) {
      return undefined
    }
    const isOffered = offeredAiFields.includes(field)
    return (
      <AiFieldButton
        label={t(`aiAssist.generateField.${field}`)}
        isPending={pendingTarget === field}
        isDisabled={isAiBusy || !isOffered || !hasContext}
        disabledHint={isOffered ? t('aiAssist.needsContext') : t('aiAssist.altTextNeedsImage')}
        onClick={() => void handleAiGenerate(field)}
      />
    )
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
    setErrorKey(toPostsErrorKey(error))
  }

  const uploadDirect = async <Result,>(
    video: File,
    consume: (uploadId: string) => Promise<Result>,
  ): Promise<Result> => {
    setUploadProgress(0)
    let ready: Models.VideoUploadReady
    try {
      ready = await uploadVideoDirect(
        video,
        video.type === 'video/webm' ? 'video/webm' : 'video/mp4',
        setUploadProgress,
      )
    } finally {
      setUploadProgress(null)
    }
    try {
      return await consume(ready.id)
    } catch (error) {
      await abortVideoUpload(ready.id).catch(() => undefined)
      throw error
    }
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
      const savedPost =
        replacement.media === 'video' && videoUploadMode === 'direct'
          ? await uploadDirect(selection.file, (uploadId) =>
              replacePostVideoFromUpload(id, uploadId),
            )
          : await replacement.upload(id, selection.file)
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
        const isDirectVideo = postType === 'video' && videoUploadMode === 'direct' && file !== null
        const create = (videoUploadId: string | null) =>
          createPost({
            type: postType,
            text,
            ...(place ? { place } : {}),
            altText,
            ...(file && !isDirectVideo ? { file: file.file } : {}),
            ...(videoUploadId ? { videoUploadId } : {}),
            ...(poster ? { poster: poster.file } : {}),
            ...(isLink ? link : { title }),
            ...(postType === 'youtube' ? { url: link.url } : {}),
          })
        const draft = isDirectVideo
          ? await uploadDirect(file.file, (uploadId) => create(uploadId))
          : await create(null)
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

  const form = (
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
              key={`title-${aiRound}`}
              label={t('postForm.postTitle')}
              labelAction={renderAiButton('title')}
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
              key={`altText-${aiRound}`}
              label={t('postForm.altText')}
              labelAction={renderAiButton('altText')}
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
            key={`text-${aiRound}`}
            label={t('postForm.text')}
            labelAction={renderAiButton('text')}
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
        {uploadProgress !== null ? (
          <div
            key={uploadProgress < 1 ? 'uploading' : 'checking'}
            className="pointer-events-auto flex w-64 animate-rise-in flex-col gap-2 rounded-xl glass px-4 py-3"
          >
            <p role="status" className="text-sm text-muted-foreground">
              {t(uploadProgress < 1 ? 'postForm.uploadingVideo' : 'postForm.checkingVideo')}
            </p>
            <Progress
              value={uploadProgress * 100}
              label={t(uploadProgress < 1 ? 'postForm.uploadingVideo' : 'postForm.checkingVideo')}
            />
          </div>
        ) : null}
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

  if (!isAiEnabled) {
    return form
  }

  return (
    <div className="flex flex-col gap-4">
      <AiPromptBar
        prompt={aiPrompt}
        isDisabled={isAiBusy}
        isGenerating={pendingTarget === 'all'}
        hasContext={hasContext}
        messageKey={failureKey ?? aiMessageKey}
        canUndo={aiSnapshot !== null}
        onPromptChange={setAiPrompt}
        onGenerateAll={() => void handleAiGenerate('all')}
        onUndo={handleAiUndo}
      />
      {form}
    </div>
  )
}
