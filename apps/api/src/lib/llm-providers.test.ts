import { describe, expect, it } from 'vitest'
import { normalizeDeepSeekOpenAIModel } from './deepseek-model-compat'

describe('normalizeDeepSeekOpenAIModel', () => {
  it('maps deprecated deepseek-chat to deepseek-v4-flash without thinking mode', () => {
    expect(normalizeDeepSeekOpenAIModel('deepseek-chat', 'default')).toEqual({
      modelName: 'deepseek-v4-flash',
    })
  })

  it('maps deprecated deepseek-reasoner to deepseek-v4-flash thinking mode', () => {
    expect(normalizeDeepSeekOpenAIModel('deepseek-reasoner', 'reasoning')).toEqual({
      modelName: 'deepseek-v4-flash',
      modelKwargs: {
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
      },
    })
  })

  it('enables thinking mode for deepseek-v4-pro on the reasoning slot', () => {
    expect(normalizeDeepSeekOpenAIModel('deepseek-v4-pro', 'reasoning')).toEqual({
      modelName: 'deepseek-v4-pro',
      modelKwargs: {
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
      },
    })
  })

  it('keeps deepseek-v4-pro unchanged outside the reasoning slot', () => {
    expect(normalizeDeepSeekOpenAIModel('deepseek-v4-pro', 'default')).toEqual({
      modelName: 'deepseek-v4-pro',
    })
  })
})
