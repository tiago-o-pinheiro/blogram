import { Value } from 'typebox/value'
import { describe, expect, it } from 'vitest'

import {
  AI_MODEL_MAX,
  AI_MODEL_SUGGESTIONS,
  AI_PROMPT_MAX,
  AI_PROVIDERS,
  AiDraftRequest,
  AiSettingsUpdate,
  isAiDraft,
  isAiSettings,
  shouldAttachAiImage,
} from './ai.model'
import { DELETE_ALL_POSTS_CONFIRM, PostBulkDelete } from './post.model'

const validUpdate = { isEnabled: true, provider: 'openai', model: 'gpt-5.4-nano', apiKey: 'k' }
const validDraftRequest = {
  prompt: '',
  postType: 'photo',
  fields: ['title'],
  title: '',
  altText: '',
  text: '',
}

describe('AiSettingsUpdate', () => {
  it('Given a provider, model and key, should accept it', () => {
    expect(Value.Check(AiSettingsUpdate, validUpdate)).toBe(true)
  })

  it('Given an empty model, should accept it', () => {
    expect(Value.Check(AiSettingsUpdate, { ...validUpdate, model: '' })).toBe(true)
  })

  it('Given a model with spaces, should reject it', () => {
    expect(Value.Check(AiSettingsUpdate, { ...validUpdate, model: 'bad model' })).toBe(false)
  })

  it('Given a model above the maximum, should reject it', () => {
    const model = 'x'.repeat(AI_MODEL_MAX + 1)

    expect(Value.Check(AiSettingsUpdate, { ...validUpdate, model })).toBe(false)
  })

  it('Given an empty api key, should reject it', () => {
    expect(Value.Check(AiSettingsUpdate, { ...validUpdate, apiKey: '' })).toBe(false)
  })

  it('Given no api key, should accept it', () => {
    expect(Value.Check(AiSettingsUpdate, { isEnabled: false, provider: 'google', model: '' })).toBe(
      true,
    )
  })

  it('Given an unknown provider, should reject it', () => {
    expect(Value.Check(AiSettingsUpdate, { ...validUpdate, provider: 'other' })).toBe(false)
  })
})

describe('AiDraftRequest', () => {
  it('Given an empty prompt and one field, should accept it', () => {
    expect(Value.Check(AiDraftRequest, validDraftRequest)).toBe(true)
  })

  it('Given no fields, should reject it', () => {
    expect(Value.Check(AiDraftRequest, { ...validDraftRequest, fields: [] })).toBe(false)
  })

  it('Given repeated fields, should reject it', () => {
    expect(Value.Check(AiDraftRequest, { ...validDraftRequest, fields: ['title', 'title'] })).toBe(
      false,
    )
  })

  it('Given a prompt above the maximum, should reject it', () => {
    const prompt = 'x'.repeat(AI_PROMPT_MAX + 1)

    expect(Value.Check(AiDraftRequest, { ...validDraftRequest, prompt })).toBe(false)
  })
})

describe('guards', () => {
  it('Given a draft with unknown keys of the right type, should recognise it', () => {
    expect(isAiDraft({ title: '::title::' })).toBe(true)
    expect(isAiDraft({ title: 1 })).toBe(false)
  })

  it('Given settings, should recognise them', () => {
    const settings = {
      isEnabled: false,
      provider: 'openai',
      model: '',
      hasApiKey: false,
      apiKeyHint: '',
    }

    expect(isAiSettings(settings)).toBe(true)
    expect(isAiSettings({ ...settings, hasApiKey: 'yes' })).toBe(false)
  })
})

describe('AI_MODEL_SUGGESTIONS', () => {
  it('Given every provider, should list at least one suggestion', () => {
    AI_PROVIDERS.forEach((provider) => {
      expect(AI_MODEL_SUGGESTIONS[provider].length).toBeGreaterThan(0)
    })
  })
})

describe('shouldAttachAiImage', () => {
  it.each([
    [['altText'], 'photo', 'has alt', true],
    [['title', 'text'], 'photo', 'has alt', false],
    [['title', 'text'], 'photo', '   ', true],
    [['title'], 'video', '', true],
    [['title'], 'video', 'has alt', false],
    [['title', 'text'], 'link', '', false],
    [['title', 'text'], 'youtube', '', false],
    [['altText'], 'link', 'x', true],
  ] as const)(
    'Given fields %j on a %s post with alt "%s", should return %s',
    (fields, type, alt, expected) => {
      expect(shouldAttachAiImage(fields, type, alt)).toBe(expected)
    },
  )
})

describe('PostBulkDelete', () => {
  it('Given the confirm literal, should accept it', () => {
    expect(Value.Check(PostBulkDelete, { confirm: DELETE_ALL_POSTS_CONFIRM })).toBe(true)
  })

  it('Given another confirm value or none, should reject it', () => {
    expect(Value.Check(PostBulkDelete, { confirm: 'yes' })).toBe(false)
    expect(Value.Check(PostBulkDelete, {})).toBe(false)
  })
})
