import * as Models from '@/models/models'

export type AiTarget = Models.AiField | 'all'

type AiImage = { file: File | null; mediaId?: string }

type AiDraftRequestInput = {
  target: AiTarget
  prompt: string
  postType: Models.PostType
  values: Record<Models.AiField, string>
  image: AiImage
}

export const toOfferedAiFields = (
  postType: Models.PostType,
  hasImage: boolean,
): Models.AiField[] => {
  const fields: Models.AiField[] = []
  if (postType === 'photo' || postType === 'video' || postType === 'youtube') {
    fields.push('title')
  }
  if (hasImage && postType !== 'youtube') {
    fields.push('altText')
  }
  fields.push('text')
  return fields
}

export const toAiDraftRequest = ({
  target,
  prompt,
  postType,
  values,
  image,
}: AiDraftRequestInput): Models.AiDraftRequest & { file?: File } => {
  const hasImage = image.file !== null || image.mediaId !== undefined
  const fields = target === 'all' ? toOfferedAiFields(postType, hasImage) : [target]
  const request: Models.AiDraftRequest & { file?: File } = {
    prompt: prompt.trim(),
    postType,
    fields,
    title: values.title,
    altText: values.altText,
    text: values.text,
  }
  const hasTextContext = hasAiContext(request.prompt, false, values)
  if (hasTextContext && !Models.shouldAttachAiImage(fields, postType, values.altText)) {
    return request
  }
  if (image.file) {
    return { ...request, file: image.file }
  }
  if (image.mediaId) {
    return { ...request, mediaId: image.mediaId }
  }
  return request
}

export const hasAiContext = (
  prompt: string,
  hasImage: boolean,
  values: Record<Models.AiField, string>,
): boolean =>
  prompt.trim() !== '' || hasImage || Models.AI_FIELDS.some((field) => values[field].trim() !== '')
