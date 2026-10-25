import sharp from 'sharp'

import { Models } from '@/models'

import { BadGatewayError, NotFoundError, ValidationError } from '@/server/errors/http-errors'
import { AI_ADAPTERS, type AiCompletionRequest } from '@/server/modules/ai/services/ai-provider'
import {
  aiSettingsService,
  type AiSettingsService,
} from '@/server/modules/ai/services/ai-settings.service'
import { postService, type PostService } from '@/server/modules/posts/services/post.service'

export const AI_FIELD_TOKEN_BUDGET: Readonly<Record<Models.AiField, number>> = {
  title: 40,
  altText: 120,
  text: 600,
}
export const AI_IMAGE_MAX_EDGE = 512
export const AI_CONTEXT_MAX_CHARS = 200

const BASE_OUTPUT_TOKENS = 32
const IMAGE_QUALITY = 70
const MAX_IMAGE_PIXELS = 100_000_000
const FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/

const SYSTEM_PROMPT =
  'You write copy for a personal photo blog post. Answer with one JSON object only, no markdown. Use the language and tone the request asks for, else match the existing text.'

const FIELD_RULES: Readonly<Record<Models.AiField, string>> = {
  title: '"title": at most 12 words, no quotes',
  altText: '"altText": what the image shows, at most 2 sentences',
  text: '"text": a caption of at most 3 sentences',
}

const FIELD_LABELS: Readonly<Record<Models.AiField, string>> = {
  title: 'Title',
  altText: 'Alt text',
  text: 'Caption',
}

const FIELD_LIMITS: Readonly<Record<Models.AiField, number>> = {
  title: Models.POST_TITLE_MAX,
  altText: Models.ALT_TEXT_MAX,
  text: Models.POST_TEXT_MAX,
}

export type AiDraftInput = Models.AiDraftRequest & { file?: File }

type AiWriterDeps = {
  fetcher?: typeof fetch
  settings?: AiSettingsService
  posts?: Pick<PostService, 'readMedia'>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toSystem = (fields: readonly Models.AiField[]): string =>
  `${SYSTEM_PROMPT} Keys and rules: ${fields.map((field) => FIELD_RULES[field]).join('; ')}.`

const toUserText = (input: Models.AiDraftRequest, hasImage: boolean): string => {
  const lines = [`Post type: ${input.postType}`]
  const prompt = input.prompt.trim()
  if (prompt !== '') {
    lines.unshift(prompt)
  }
  if (hasImage) {
    lines.push('An image is attached.')
  }
  Models.AI_FIELDS.forEach((field) => {
    const value = input[field].trim()
    if (value === '') {
      return
    }
    const isTarget = input.fields.includes(field)
    const shown = isTarget ? value : value.slice(0, AI_CONTEXT_MAX_CHARS)
    lines.push(`${FIELD_LABELS[field]}${isTarget ? ' (current)' : ''}: ${shown}`)
  })
  return lines.join('\n')
}

const toMaxOutputTokens = (fields: readonly Models.AiField[]): number =>
  fields.reduce((sum, field) => sum + AI_FIELD_TOKEN_BUDGET[field], BASE_OUTPUT_TOKENS)

const parseAnswer = (answer: string): unknown => {
  const trimmed = answer.trim()
  const unfenced = FENCE_PATTERN.exec(trimmed)?.[1] ?? trimmed
  try {
    return JSON.parse(unfenced)
  } catch {
    return null
  }
}

const toDraft = (answer: string, fields: readonly Models.AiField[]): Models.AiDraft => {
  const parsed = parseAnswer(answer)
  const draft: Models.AiDraft = {}
  if (isRecord(parsed)) {
    fields.forEach((field) => {
      const value = parsed[field]
      const cleaned = typeof value === 'string' ? value.trim().slice(0, FIELD_LIMITS[field]) : ''
      if (cleaned !== '') {
        draft[field] = cleaned
      }
    })
  }
  if (Object.keys(draft).length === 0) {
    throw new BadGatewayError('AI provider answer was not usable', { reason: 'invalid-response' })
  }
  return draft
}

const toSmallJpeg = async (source: Uint8Array): Promise<string> => {
  try {
    const output = await sharp(source, { limitInputPixels: MAX_IMAGE_PIXELS })
      .rotate()
      .resize({
        width: AI_IMAGE_MAX_EDGE,
        height: AI_IMAGE_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: IMAGE_QUALITY })
      .toBuffer()
    return output.toString('base64')
  } catch {
    throw new ValidationError('Image could not be read')
  }
}

export class AiWriterService {
  private readonly fetcher: typeof fetch
  private readonly settings: AiSettingsService
  private readonly posts: Pick<PostService, 'readMedia'>

  constructor(deps: AiWriterDeps = {}) {
    this.fetcher = deps.fetcher ?? ((input, init) => globalThis.fetch(input, init))
    this.settings = deps.settings ?? aiSettingsService
    this.posts = deps.posts ?? postService
  }

  draft = async (input: AiDraftInput): Promise<Models.AiDraft> => {
    const credentials = await this.settings.readCredentials()
    const image = await this.loadImage(input)
    if (input.fields.includes('altText') && !image) {
      throw new ValidationError('Alt text needs an image')
    }
    const hasValues = Models.AI_FIELDS.some((field) => input[field].trim() !== '')
    if (input.prompt.trim() === '' && !image && !hasValues) {
      throw new ValidationError('Write a prompt or add content first')
    }
    const request: AiCompletionRequest = {
      model: credentials.model,
      apiKey: credentials.apiKey,
      system: toSystem(input.fields),
      prompt: toUserText(input, image !== null),
      maxOutputTokens: toMaxOutputTokens(input.fields),
      ...(image ? { image: { base64: image, mediaType: 'image/jpeg' } } : {}),
    }
    const answer = await AI_ADAPTERS[credentials.provider](request, this.fetcher)
    return toDraft(answer, input.fields)
  }

  private loadImage = async (input: AiDraftInput): Promise<string | null> => {
    const hasTextContext =
      input.prompt.trim() !== '' || Models.AI_FIELDS.some((field) => input[field].trim() !== '')
    if (hasTextContext && !Models.shouldAttachAiImage(input.fields, input.postType, input.altText)) {
      return null
    }
    if (input.file) {
      return toSmallJpeg(new Uint8Array(await input.file.arrayBuffer()))
    }
    if (input.mediaId) {
      return toSmallJpeg(await this.readSavedImage(input.mediaId))
    }
    return null
  }

  private readSavedImage = async (mediaId: string): Promise<Uint8Array> => {
    try {
      const { object } = await this.posts.readMedia(mediaId, { isOwner: true, variant: 'w960' })
      return object.body
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error
      }
    }
    const { object } = await this.posts.readMedia(mediaId, { isOwner: true })
    return object.body
  }
}

export const aiWriterService = new AiWriterService()
