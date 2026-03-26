import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import {
  resolveLlmChatConfig,
  llmConfigCacheKey,
  peekLlmProviderKind,
  type LlmCallOptionsInput,
  type LlmModelPurpose,
  type LlmProviderKind,
} from './llm-providers'

export type LlmCallOptions = LlmCallOptionsInput
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
      apiKey: resolved.apiKey,
      configuration: {
        baseURL: resolved.baseURL,
      },
    })
    modelCache.set(cacheKey, chatModel)
  }
  return chatModel ?? null
}

function chatConfigErrorHint(options?: LlmCallOptions): string {
  const kind = peekLlmProviderKind(options)
  if (kind === 'qwen') {
    return 'DASHSCOPE_API_KEY 未配置，或当前槽位的 LLM_PROVIDER_* 指向 qwen 但 Key 无效'
  }
  return 'OPENAI_API_KEY / OPENAI_API_KEY_* 未配置，或当前槽位指向的 OpenAI 兼容服务不可用'
}

export async function* streamChat(
  userPrompt: string,
  systemPrompt?: string,
  options?: LlmCallOptions
): AsyncGenerator<string, void, undefined> {
  const model = getChatModel(options)
  if (!model) {
    throw new Error(chatConfigErrorHint(options))
  }
  const messages = [
    ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
    new HumanMessage(userPrompt),
  ]
  const stream = await model.stream(messages)
  for await (const chunk of stream) {
    const text = normalizeMessageContent(chunk.content)
    if (text) yield text
  }
}

export async function invokeChat(
  userPrompt: string,
  systemPrompt?: string,
  options?: LlmCallOptions
): Promise<string> {
  const model = getChatModel(options)
  if (!model) {
    throw new Error(chatConfigErrorHint(options))
  }
  const messages = [
    ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
    new HumanMessage(userPrompt),
  ]
  const res = await model.invoke(messages)
  return normalizeMessageContent(res.content)
}
