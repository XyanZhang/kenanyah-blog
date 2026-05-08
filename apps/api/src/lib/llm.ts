import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { logger } from './logger'
import {
  resolveLlmChatConfig,
  llmConfigCacheKey,
  peekLlmProviderKind,
  type LlmCallOptionsInput,
  type LlmModelPurpose,
  type LlmProviderKind,
} from './llm-providers'

export type LlmCallOptions = LlmCallOptionsInput
export type LlmExecutionOptions = LlmCallOptions & { signal?: AbortSignal }
export type { LlmModelPurpose, LlmProviderKind }

export {
  resolveLlmChatConfig,
  peekLlmProviderKind,
  getDashScopeOpenAICompatBaseUrl,
} from './llm-providers'

const modelCache = new Map<string, ChatOpenAI>()

/** 统一解析模型返回（千问等可能返回多段 content） */
function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        typeof p === 'string'
          ? p
          : p && typeof p === 'object' && 'text' in p
            ? String((p as { text: unknown }).text)
            : ''
      )
      .join('')
  }
  return ''
}

function getChatModel(options?: LlmCallOptions): ChatOpenAI | null {
  const resolved = resolveLlmChatConfig(options)
  if (!resolved) return null

  const cacheKey = llmConfigCacheKey(resolved)
  let chatModel = modelCache.get(cacheKey) ?? null
  if (!chatModel) {
    chatModel = new ChatOpenAI({
      modelName: resolved.modelName,
      temperature: resolved.temperature,
      ...(resolved.maxTokens != null ? { maxTokens: resolved.maxTokens } : {}),
      ...(resolved.modelKwargs ? { modelKwargs: resolved.modelKwargs } : {}),
      apiKey: resolved.apiKey,
      configuration: {
        baseURL: resolved.baseURL,
      },
    })
    modelCache.set(cacheKey, chatModel)
  }
  return chatModel ?? null
}

function getSafeLlmDiagnostics(options?: LlmCallOptions) {
  const resolved = resolveLlmChatConfig(options)
  if (!resolved) {
    return {
      provider: peekLlmProviderKind(options),
      modelName: options?.model ?? 'default',
      configured: false,
    }
  }

  return {
    provider: resolved.provider,
    modelName: resolved.modelName,
    baseURL: resolved.baseURL,
    configured: true,
  }
}

function chatConfigErrorHint(options?: LlmCallOptions): string {
  const kind = peekLlmProviderKind(options)
  if (kind === 'qwen') {
    return 'DASHSCOPE_API_KEY 未配置，或当前槽位的 LLM_PROVIDER_* 指向 qwen 但 Key 无效'
  }
  return 'OPENAI_API_KEY / OPENAI_API_KEY_* 未配置，或当前槽位指向的 OpenAI 兼容服务不可用'
}

function normalizeLlmError(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error && err.message.trim()) {
    return err
  }

  if (typeof err === 'string' && err.trim()) {
    return new Error(err)
  }

  return new Error(fallbackMessage)
}

export async function* streamChat(
  userPrompt: string,
  systemPrompt?: string,
  options?: LlmExecutionOptions
): AsyncGenerator<string, void, undefined> {
  const model = getChatModel(options)
  if (!model) {
    throw new Error(chatConfigErrorHint(options))
  }
  const messages = [
    ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
    new HumanMessage(userPrompt),
  ]
  const startedAt = Date.now()
  try {
    const stream = await model.stream(messages, options?.signal ? { signal: options.signal } : undefined)
    for await (const chunk of stream) {
      const text = normalizeMessageContent(chunk.content)
      if (text) yield text
    }
  } catch (err) {
    logger.warn(
      {
        err: normalizeLlmError(err, 'LLM 流式调用失败'),
        elapsedMs: Date.now() - startedAt,
        llm: getSafeLlmDiagnostics(options),
      },
      'llm.stream.failed'
    )
    throw normalizeLlmError(err, 'LLM 流式调用失败，请检查模型配置或稍后重试')
  }
}

export async function invokeChat(
  userPrompt: string,
  systemPrompt?: string,
  options?: LlmExecutionOptions
): Promise<string> {
  const model = getChatModel(options)
  if (!model) {
    throw new Error(chatConfigErrorHint(options))
  }
  const messages = [
    ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
    new HumanMessage(userPrompt),
  ]
  const startedAt = Date.now()
  try {
    const res = await model.invoke(messages, options?.signal ? { signal: options.signal } : undefined)
    return normalizeMessageContent(res.content)
  } catch (err) {
    logger.warn(
      {
        err: normalizeLlmError(err, 'LLM 调用失败'),
        elapsedMs: Date.now() - startedAt,
        llm: getSafeLlmDiagnostics(options),
      },
      'llm.invoke.failed'
    )
    throw normalizeLlmError(err, 'LLM 调用失败，请检查模型配置或稍后重试')
  }
}
