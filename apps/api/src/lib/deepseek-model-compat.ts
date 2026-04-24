import type { LlmModelPurpose } from './llm-providers'

type DeepSeekCompatibilityResult = {
  modelName: string
  modelKwargs?: Record<string, unknown>
}

export function normalizeDeepSeekOpenAIModel(
  modelName: string,
  purpose: LlmModelPurpose
): DeepSeekCompatibilityResult {
  if (modelName === 'deepseek-chat') {
    return {
      modelName: 'deepseek-v4-flash',
    }
  }

  if (modelName === 'deepseek-reasoner') {
    return {
      modelName: 'deepseek-v4-flash',
      modelKwargs: {
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
      },
    }
  }

  if (purpose === 'reasoning' && (modelName === 'deepseek-v4-flash' || modelName === 'deepseek-v4-pro')) {
    return {
      modelName,
      modelKwargs: {
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
      },
    }
  }

  return { modelName }
}
