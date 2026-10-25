import { StatusCodes } from 'http-status-codes'
import { Type } from 'typebox'
import { Value } from 'typebox/value'

import { type Models } from '@/models'

import { BadGatewayError } from '@/server/errors/http-errors'

const REQUEST_TIMEOUT_MS = 45_000
const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const OPENAI_GPT5_PATTERN = /^gpt-5/
const OPENAI_REASONING_PATTERN = /^o\d/
const GEMINI_INVALID_KEY_REASON = 'API_KEY_INVALID'
const GEMINI_25_FLASH_PATTERN = /^gemini-2\.5.*flash/
const GEMINI_3_FLASH_PATTERN = /^gemini-3.*flash/

export type AiCompletionRequest = {
  model: string
  apiKey: string
  system: string
  prompt: string
  maxOutputTokens: number
  image?: { base64: string; mediaType: 'image/jpeg' }
}

export type AiProviderAdapter = (
  request: AiCompletionRequest,
  fetcher: typeof fetch,
) => Promise<string>

const OpenAiAnswer = Type.Object({
  choices: Type.Array(Type.Object({ message: Type.Object({ content: Type.String() }) }), {
    minItems: 1,
  }),
})

const AnthropicAnswer = Type.Object({
  content: Type.Array(Type.Object({ type: Type.String(), text: Type.Optional(Type.String()) })),
})

const GeminiAnswer = Type.Object({
  candidates: Type.Array(
    Type.Object({
      content: Type.Object({
        parts: Type.Array(Type.Object({ text: Type.Optional(Type.String()) })),
      }),
    }),
    { minItems: 1 },
  ),
})

const toFailureReason = (status: number): Models.AiFailureReason => {
  if (status === StatusCodes.UNAUTHORIZED || status === StatusCodes.FORBIDDEN) {
    return 'auth'
  }
  if (status === StatusCodes.TOO_MANY_REQUESTS) {
    return 'rate-limit'
  }
  if (status === StatusCodes.NOT_FOUND) {
    return 'model'
  }
  return 'unavailable'
}

const toGeminiFailureReason = async (response: Response): Promise<Models.AiFailureReason> => {
  if (response.status !== StatusCodes.BAD_REQUEST) {
    return toFailureReason(response.status)
  }
  const bodyText = await response.text().catch(() => '')
  return bodyText.includes(GEMINI_INVALID_KEY_REASON) ? 'auth' : 'unavailable'
}

const toFailureMessage = (reason: Models.AiFailureReason): string =>
  `AI provider request failed: ${reason}`

const fail = (reason: Models.AiFailureReason): BadGatewayError =>
  new BadGatewayError(toFailureMessage(reason), { reason })

const postJson = async (
  fetcher: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  toReason: (response: Response) => Promise<Models.AiFailureReason> = async (response) =>
    toFailureReason(response.status),
): Promise<unknown> => {
  let response: Response
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw fail('unavailable')
  }
  if (!response.ok) {
    throw fail(await toReason(response))
  }
  try {
    return await response.json()
  } catch {
    throw fail('invalid-response')
  }
}

const readText = (text: string | undefined): string => {
  if (!text) {
    throw fail('invalid-response')
  }
  return text
}

const toOpenAiReasoning = (model: string): Record<string, string> => {
  if (OPENAI_GPT5_PATTERN.test(model) || OPENAI_REASONING_PATTERN.test(model)) {
    return { reasoning_effort: 'low' }
  }
  return {}
}

const createChatAdapter =
  (
    baseUrl: string,
    toLimitAndReasoning: (request: AiCompletionRequest) => Record<string, unknown>,
  ): AiProviderAdapter =>
  async (request, fetcher) => {
    const userContent = request.image
      ? [
          { type: 'text', text: request.prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${request.image.mediaType};base64,${request.image.base64}`,
              detail: 'low',
            },
          },
        ]
      : request.prompt
    const answer = await postJson(
      fetcher,
      `${baseUrl}/chat/completions`,
      { authorization: `Bearer ${request.apiKey}` },
      {
        model: request.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: userContent },
        ],
        ...toLimitAndReasoning(request),
      },
    )
    if (!Value.Check(OpenAiAnswer, answer)) {
      throw fail('invalid-response')
    }
    return readText(answer.choices[0]?.message.content)
  }

const openAiAdapter = createChatAdapter(OPENAI_BASE_URL, (request) => ({
  max_completion_tokens: request.maxOutputTokens,
  ...toOpenAiReasoning(request.model),
}))

const openRouterAdapter = createChatAdapter(OPENROUTER_BASE_URL, (request) => ({
  max_tokens: request.maxOutputTokens,
}))

const anthropicAdapter: AiProviderAdapter = async (request, fetcher) => {
  const content = request.image
    ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: request.image.mediaType,
            data: request.image.base64,
          },
        },
        { type: 'text', text: request.prompt },
      ]
    : request.prompt
  const answer = await postJson(
    fetcher,
    ANTHROPIC_URL,
    { 'x-api-key': request.apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    {
      model: request.model,
      max_tokens: request.maxOutputTokens,
      system: request.system,
      messages: [{ role: 'user', content }],
    },
  )
  if (!Value.Check(AnthropicAnswer, answer)) {
    throw fail('invalid-response')
  }
  return readText(answer.content.find((block) => block.type === 'text')?.text)
}

const toGeminiThinking = (model: string): Record<string, unknown> => {
  if (GEMINI_25_FLASH_PATTERN.test(model)) {
    return { thinkingConfig: { thinkingBudget: 0 } }
  }
  if (GEMINI_3_FLASH_PATTERN.test(model)) {
    return { thinkingConfig: { thinkingLevel: 'minimal' } }
  }
  return {}
}

const googleAdapter: AiProviderAdapter = async (request, fetcher) => {
  const parts = [
    ...(request.image
      ? [{ inlineData: { mimeType: request.image.mediaType, data: request.image.base64 } }]
      : []),
    { text: request.prompt },
  ]
  const answer = await postJson(
    fetcher,
    `${GEMINI_BASE_URL}/${encodeURIComponent(request.model)}:generateContent`,
    { 'x-goog-api-key': request.apiKey },
    {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: request.maxOutputTokens,
        ...toGeminiThinking(request.model),
      },
    },
    toGeminiFailureReason,
  )
  if (!Value.Check(GeminiAnswer, answer)) {
    throw fail('invalid-response')
  }
  const text = answer.candidates[0]?.content.parts.map((part) => part.text ?? '').join('')
  return readText(text)
}

export const AI_ADAPTERS: Readonly<Record<Models.AiProvider, AiProviderAdapter>> = {
  openai: openAiAdapter,
  anthropic: anthropicAdapter,
  google: googleAdapter,
  openrouter: openRouterAdapter,
}
