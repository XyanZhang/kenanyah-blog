import { env } from '../env'

/** 文本聊天可路由的厂商（千问走 DashScope OpenAI 兼容模式） */
export type LlmProviderKind = 'openai' | 'qwen'

export type LlmModelPurpose = 'default' | 'fast' | 'reasoning'

const QWEN_COMPAT_PATH = '/compatible-mode/v1'

export function getDashScopeOpenAICompatBaseUrl(): string {
  const origin = new URL(env.DASHSCOPE_BASE_URL).origin
  return `${origin}${QWEN_COMPAT_PATH}`
}

export type LlmCallOptionsInput = {
  model?: LlmModelPurpose | string
  /** 显式指定厂商，覆盖按用途解析的 LLM_PROVIDER_* */
  provider?: LlmProviderKind
  temperature?: number
  maxTokens?: number
}

export type ResolvedLlmChat = {
  provider: LlmProviderKind
  apiKey: string
  baseURL: string | undefined
  modelName: string
  temperature: number
  maxTokens?: number
}

function isPurpose(v: string): v is LlmModelPurpose {
  return v === 'default' || v === 'fast' || v === 'reasoning'
}

/** 按用途槽位解析环境变量中的厂商（openai | qwen） */
/** 不校验 API Key，仅用于错误提示或日志 */
export function peekLlmProviderKind(options?: LlmCallOptionsInput): LlmProviderKind {
  const rawModel = options?.model
  if (options?.provider) return options.provider
  if (rawModel && isPurpose(rawModel)) return resolveProviderForPurpose(rawModel)
  return env.LLM_PROVIDER_DEFAULT
}

function resolveProviderForPurpose(purpose: LlmModelPurpose): LlmProviderKind {
  if (purpose === 'fast') {
    return env.LLM_PROVIDER_FAST ?? env.LLM_PROVIDER_DEFAULT
  }
  if (purpose === 'reasoning') {
    return (
      env.LLM_PROVIDER_REASONING ??
      env.LLM_PROVIDER_FAST ??
      env.LLM_PROVIDER_DEFAULT
    )
  }
  return env.LLM_PROVIDER_DEFAULT
}

function resolveOpenAIModelName(purpose: LlmModelPurpose): string {
  const fallback = env.OPENAI_MODEL_DEFAULT || env.OPENAI_MODEL
  if (purpose === 'fast') return env.OPENAI_MODEL_FAST || fallback
  if (purpose === 'reasoning') {
    return env.OPENAI_MODEL_REASONING || env.OPENAI_MODEL_FAST || fallback
  }
  return fallback
}

function resolveOpenAIApiKey(purpose?: LlmModelPurpose): string | undefined {
  if (purpose === 'fast') {
    return env.OPENAI_API_KEY_FAST || env.OPENAI_API_KEY_DEFAULT || env.OPENAI_API_KEY
  }
  if (purpose === 'reasoning') {
    return (
      env.OPENAI_API_KEY_REASONING ||
      env.OPENAI_API_KEY_FAST ||
      env.OPENAI_API_KEY_DEFAULT ||
      env.OPENAI_API_KEY
    )
  }
  return env.OPENAI_API_KEY_DEFAULT || env.OPENAI_API_KEY
}

function resolveOpenAIBaseUrl(purpose?: LlmModelPurpose): string | undefined {
  if (purpose === 'fast') {
    return env.OPENAI_BASE_URL_FAST || env.OPENAI_BASE_URL_DEFAULT || env.OPENAI_BASE_URL
  }
  if (purpose === 'reasoning') {
    return (
      env.OPENAI_BASE_URL_REASONING ||
      env.OPENAI_BASE_URL_FAST ||
      env.OPENAI_BASE_URL_DEFAULT ||
      env.OPENAI_BASE_URL
    )
  }
  return env.OPENAI_BASE_URL_DEFAULT || env.OPENAI_BASE_URL
}

function resolveQwenModelName(purpose: LlmModelPurpose): string {
  if (purpose === 'reasoning') {
    return (
      env.DASHSCOPE_CHAT_MODEL_REASONING ||
      env.DASHSCOPE_CHAT_MODEL_FAST ||
      env.DASHSCOPE_CHAT_MODEL
    )
  }
  if (purpose === 'fast') {
    return env.DASHSCOPE_CHAT_MODEL_FAST || env.DASHSCOPE_CHAT_MODEL
  }
  return env.DASHSCOPE_CHAT_MODEL
}

/**
 * 把 LlmCallOptions 解析为可直接构造 ChatOpenAI 的配置。
 * Agent / 路由可 import 本函数，按同一套环境变量接入不同模型。
 */
export function resolveLlmChatConfig(
  options?: LlmCallOptionsInput
): ResolvedLlmChat | null {
  const rawModel = options?.model
  const purposeFromModel: LlmModelPurpose =
    rawModel && isPurpose(rawModel) ? rawModel : 'default'

  const provider: LlmProviderKind = (() => {
    if (options?.provider) return options.provider
    if (rawModel && isPurpose(rawModel)) return resolveProviderForPurpose(rawModel)
    return env.LLM_PROVIDER_DEFAULT
  })()

  const temperature = options?.temperature ?? 1.5
  const maxTokens = options?.maxTokens

  if (provider === 'qwen') {
    const apiKey = env.DASHSCOPE_API_KEY
    if (!apiKey) return null
    const modelName =
      rawModel && !isPurpose(rawModel)
        ? rawModel
        : resolveQwenModelName(purposeFromModel)
    return {
      provider: 'qwen',
      apiKey,
      baseURL: getDashScopeOpenAICompatBaseUrl(),
      modelName,
      temperature,
      maxTokens,
    }
  }

  // OpenAI 兼容（含 DeepSeek 等自建网关）
  const apiKey =
    rawModel && isPurpose(rawModel)
      ? resolveOpenAIApiKey(rawModel)
      : resolveOpenAIApiKey(undefined)
  if (!apiKey) return null

  const baseURL =
    rawModel && isPurpose(rawModel)
      ? resolveOpenAIBaseUrl(rawModel)
      : resolveOpenAIBaseUrl(undefined)
  const modelName =
    rawModel && !isPurpose(rawModel)
      ? rawModel
      : resolveOpenAIModelName(purposeFromModel)

  return {
    provider: 'openai',
    apiKey,
    baseURL,
    modelName,
    temperature,
    maxTokens,
  }
}

export function llmConfigCacheKey(resolved: ResolvedLlmChat): string {
  return [
    resolved.provider,
    resolved.baseURL ?? '',
    resolved.modelName,
    String(resolved.temperature),
    resolved.maxTokens ?? '',
  ].join('::')
}
