// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { AI_ADAPTERS, type AiCompletionRequest } from './ai-provider'

const API_KEY = 'secret-key-1234'
const IMAGE = { base64: 'QUJD', mediaType: 'image/jpeg' } as const

const toRequest = (overrides: Partial<AiCompletionRequest> = {}): AiCompletionRequest => ({
  model: 'gpt-5-nano',
  apiKey: API_KEY,
  system: 'system text',
  prompt: 'user text',
  maxOutputTokens: 77,
  ...overrides,
})

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const createFetcher = (response: Response | Error) =>
  vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) {
      throw response
    }
    return response
  })

const readCall = (fetcher: ReturnType<typeof createFetcher>) => {
  const [url, init] = fetcher.mock.calls[0] ?? []
  const headers = new Headers(init?.headers)
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
  return { url: String(url), headers, body }
}

const openAiAnswer = { choices: [{ message: { content: '{"title":"Hi"}' } }] }

describe('openai adapter', () => {
  it('Given an image, should call chat completions with bearer auth, low detail and token cap', async () => {
    const fetcher = createFetcher(jsonResponse(openAiAnswer))

    const text = await AI_ADAPTERS.openai(toRequest({ image: IMAGE }), fetcher)

    const { url, headers, body } = readCall(fetcher)
    expect(text).toBe('{"title":"Hi"}')
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(headers.get('authorization')).toBe(`Bearer ${API_KEY}`)
    expect(body).toMatchObject({
      model: 'gpt-5-nano',
      response_format: { type: 'json_object' },
      max_completion_tokens: 77,
      reasoning_effort: 'low',
    })
    expect(body.messages[1].content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,QUJD', detail: 'low' },
    })
  })

  it.each([
    ['o4-mini', true],
    ['gpt-5.4-mini', true],
    ['gpt-4.1-mini', false],
  ])('Given model %s, should send reasoning effort is %s', async (model, hasReasoning) => {
    const fetcher = createFetcher(jsonResponse(openAiAnswer))

    await AI_ADAPTERS.openai(toRequest({ model }), fetcher)

    const { body } = readCall(fetcher)
    expect('reasoning_effort' in body).toBe(hasReasoning)
    expect(body.messages[1].content).toBe('user text')
  })
})

describe('openrouter adapter', () => {
  it('Given a request, should use the openrouter url, max_tokens and no reasoning param', async () => {
    const fetcher = createFetcher(jsonResponse(openAiAnswer))

    await AI_ADAPTERS.openrouter(toRequest({ model: 'openai/gpt-5-nano' }), fetcher)

    const { url, body } = readCall(fetcher)
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(body.max_tokens).toBe(77)
    expect('reasoning_effort' in body).toBe(false)
    expect('max_completion_tokens' in body).toBe(false)
  })
})

describe('anthropic adapter', () => {
  it('Given an image, should send x-api-key, version header, base64 block and no thinking', async () => {
    const fetcher = createFetcher(
      jsonResponse({ content: [{ type: 'text', text: '{"text":"x"}' }] }),
    )

    const text = await AI_ADAPTERS.anthropic(
      toRequest({ model: 'claude-haiku-4-5', image: IMAGE }),
      fetcher,
    )

    const { url, headers, body } = readCall(fetcher)
    expect(text).toBe('{"text":"x"}')
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(headers.get('x-api-key')).toBe(API_KEY)
    expect(headers.get('anthropic-version')).toBe('2023-06-01')
    expect(body.max_tokens).toBe(77)
    expect(body.system).toBe('system text')
    expect('thinking' in body).toBe(false)
    expect(body.messages[0].content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' },
    })
  })
})

describe('google adapter', () => {
  const answer = {
    candidates: [{ content: { parts: [{ text: '{"altText":' }, { text: '"a"}' }] } }],
  }

  it.each([
    ['gemini-2.5-flash-lite', { thinkingBudget: 0 }],
    ['gemini-3.6-flash', { thinkingLevel: 'minimal' }],
    ['gemini-2.5-pro', undefined],
  ])('Given model %s, should set thinking config %j', async (model, thinkingConfig) => {
    const fetcher = createFetcher(jsonResponse(answer))

    const text = await AI_ADAPTERS.google(toRequest({ model, image: IMAGE }), fetcher)

    const { url, headers, body } = readCall(fetcher)
    expect(text).toBe('{"altText":"a"}')
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    )
    expect(headers.get('x-goog-api-key')).toBe(API_KEY)
    expect(body.generationConfig.responseMimeType).toBe('application/json')
    expect(body.generationConfig.maxOutputTokens).toBe(77)
    expect(body.generationConfig.thinkingConfig).toEqual(thinkingConfig)
    expect(body.contents[0].parts[0]).toEqual({
      inlineData: { mimeType: 'image/jpeg', data: 'QUJD' },
    })
  })
})

describe('provider failures', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate-limit'],
    [404, 'model'],
    [500, 'unavailable'],
  ])('Given status %i, should throw a 502 with reason %s and call once', async (status, reason) => {
    const fetcher = createFetcher(jsonResponse({ error: API_KEY }, status))

    const failure = await AI_ADAPTERS.openai(toRequest(), fetcher).catch((error: unknown) => error)

    expect(failure).toMatchObject({ statusCode: 502, details: { reason } })
    expect(String(failure)).not.toContain(API_KEY)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('Given a gemini 400 for an invalid key, should throw reason auth without echoing the body', async () => {
    const fetcher = createFetcher(
      jsonResponse(
        { error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } },
        400,
      ),
    )

    const failure = await AI_ADAPTERS.google(toRequest(), fetcher).catch((error: unknown) => error)

    expect(failure).toMatchObject({ statusCode: 502, details: { reason: 'auth' } })
    expect(String(failure)).not.toContain('API_KEY_INVALID')
  })

  it('Given a gemini 400 unrelated to the key, should throw reason unavailable', async () => {
    const fetcher = createFetcher(
      jsonResponse({ error: { status: 'INVALID_ARGUMENT', message: 'Bad schema' } }, 400),
    )

    await expect(AI_ADAPTERS.google(toRequest(), fetcher)).rejects.toMatchObject({
      statusCode: 502,
      details: { reason: 'unavailable' },
    })
  })

  it('Given a network timeout, should throw reason unavailable', async () => {
    const fetcher = createFetcher(new DOMException('timeout', 'TimeoutError'))

    await expect(AI_ADAPTERS.anthropic(toRequest(), fetcher)).rejects.toMatchObject({
      statusCode: 502,
      details: { reason: 'unavailable' },
    })
  })

  it('Given a non-JSON body, should throw reason invalid-response', async () => {
    const fetcher = createFetcher(new Response('<html>', { status: 200 }))

    await expect(AI_ADAPTERS.google(toRequest(), fetcher)).rejects.toMatchObject({
      details: { reason: 'invalid-response' },
    })
  })

  it('Given a body without the expected shape, should throw reason invalid-response', async () => {
    const fetcher = createFetcher(jsonResponse({ choices: [] }))

    await expect(AI_ADAPTERS.openai(toRequest(), fetcher)).rejects.toMatchObject({
      details: { reason: 'invalid-response' },
    })
  })
})
