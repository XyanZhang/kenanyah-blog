import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { env } from '../env'

export type LlmModelPurpose = 'default' | 'fast' | 'reasoning'
export type LlmCallOptions = {
  model?: LlmModelPurpose | string
  temperature?: number
}

const modelCache = new Map<string, ChatOpenAI>()

function isPurpose(value: string): value is LlmModelPurpose {
  return value === 'default' || value === 'fast' || value === 'reasoning'
}

function getDefaultModelName(): string {
  return env.OPENAI_MODEL_DEFAULT || env.OPENAI_MODEL
}

function resolveModelName(model?: LlmModelPurpose | string): string {
  if (!model) return getDefaultModelName()
  if (!isPurpose(model)) return model
  if (model === 'fast') return env.OPENAI_MODEL_FAST || getDefaultModelName()
  if (model === 'reasoning') return env.OPENAI_MODEL_REASONING || env.OPENAI_MODEL_FAST || getDefaultModelName()
  return getDefaultModelName()
}

function resolveApiKey(model?: LlmModelPurpose | string): string | undefined {
  if (model && isPurpose(model)) {
    if (model === 'fast') return env.OPENAI_API_KEY_FAST || env.OPENAI_API_KEY_DEFAULT || env.OPENAI_API_KEY
    if (model === 'reasoning') return env.OPENAI_API_KEY_REASONING || env.OPENAI_API_KEY_FAST || env.OPENAI_API_KEY_DEFAULT || env.OPENAI_API_KEY
  }
  return env.OPENAI_API_KEY_DEFAULT || env.OPENAI_API_KEY
}

function resolveBaseUrl(model?: LlmModelPurpose | string): string | undefined {
  if (model && isPurpose(model)) {
    if (model === 'fast') return env.OPENAI_BASE_URL_FAST || env.OPENAI_BASE_URL_DEFAULT || env.OPENAI_BASE_URL
    if (model === 'reasoning') return env.OPENAI_BASE_URL_REASONING || env.OPENAI_BASE_URL_FAST || env.OPENAI_BASE_URL_DEFAULT || env.OPENAI_BASE_URL
  }
  return env.OPENAI_BASE_URL_DEFAULT || env.OPENAI_BASE_URL
}

function getChatModel(options?: LlmCallOptions): ChatOpenAI | null {
  const apiKey = resolveApiKey(options?.model)
  if (!apiKey) {
    return null
  }
  const modelName = resolveModelName(options?.model)
  const baseURL = resolveBaseUrl(options?.model)
  const temperature = options?.temperature ?? 1.5
  const cacheKey = `${baseURL || ''}::${modelName}::${temperature}`

  let chatModel = modelCache.get(cacheKey) ?? null
  if (!chatModel) {
    chatModel = new ChatOpenAI({
      modelName,
      temperature,
      apiKey,
      configuration: {
        baseURL,
      },
    })
    modelCache.set(cacheKey, chatModel)
  }
  return chatModel ?? null
}

export async function* streamChat(
  userPrompt: string,
  systemPrompt?: string,
  options?: LlmCallOptions
): AsyncGenerator<string, void, undefined> {
  const model = getChatModel(options)
  if (!model) {
    throw new Error('OPENAI_API_KEY is not configured for selected model/provider')
  }
  const messages = [
    ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
    new HumanMessage(userPrompt),
  ]
  const stream = await model.stream(messages)
  for await (const chunk of stream) {
    const content = chunk.content
    if (typeof content === 'string' && content) {
      yield content
    }
  }
}

export async function invokeChat(
  userPrompt: string,
  systemPrompt?: string,
  options?: LlmCallOptions
): Promise<string> {
  const model = getChatModel(options)
  if (!model) {
    throw new Error('OPENAI_API_KEY is not configured for selected model/provider')
  }
  const messages = [
    ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
    new HumanMessage(userPrompt),
  ]
  const res = await model.invoke(messages)
  return typeof res.content === 'string' ? res.content : ''
}
