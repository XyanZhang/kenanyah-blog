import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { env } from '../env'

let chatModel: ChatOpenAI | null = null

/**
 * 规范化 baseURL：去掉末尾斜线，并确保带 /v1（OpenAI 兼容接口通常需要）。
 * 若已包含 /v1 则不再重复添加。
 */
function normalizeBaseUrl(url: string): string {
  return url
}

function getChatModel(): ChatOpenAI | null {
  if (!env.OPENAI_API_KEY) {
    return null
  }
  if (!chatModel) {
    const baseURL = env.OPENAI_BASE_URL;
    chatModel = new ChatOpenAI({
      modelName: env.OPENAI_MODEL,
      temperature: 1.5,
      apiKey: env.OPENAI_API_KEY,
      configuration: {
        baseURL: baseURL,
      },
    })
  }
  return chatModel
}

export async function* streamChat(
  userPrompt: string,
  systemPrompt?: string
): AsyncGenerator<string, void, undefined> {
  const model = getChatModel()
  if (!model) {
    throw new Error('OPENAI_API_KEY is not configured')
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

export async function invokeChat(userPrompt: string, systemPrompt?: string): Promise<string> {
  const model = getChatModel()
  if (!model) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  const messages = [
    ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
    new HumanMessage(userPrompt),
  ]
  const res = await model.invoke(messages)
  return typeof res.content === 'string' ? res.content : ''
}
