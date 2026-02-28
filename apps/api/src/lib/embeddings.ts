import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '../env'

let embeddingsModel: OpenAIEmbeddings | null = null

/** 用于 Embedding 的 API Key（优先 EMBEDDINGS_API_KEY，否则用 OPENAI_API_KEY） */
function getEmbeddingApiKey(): string | undefined {
  return env.EMBEDDINGS_API_KEY ?? env.OPENAI_API_KEY
}

export function getEmbeddingsModel(): OpenAIEmbeddings | null {
  const apiKey = getEmbeddingApiKey()
  if (!apiKey) return null
  if (!embeddingsModel) {
    embeddingsModel = new OpenAIEmbeddings({
      apiKey,
      modelName: env.EMBEDDINGS_MODEL_NAME,
      configuration: { baseURL: env.EMBEDDINGS_BASE_URL },
    })
  }
  return embeddingsModel
}

/** 单条文本向量化 */
export async function embedQuery(text: string): Promise<number[]> {
  const model = getEmbeddingsModel()
  if (!model) throw new Error('Embedding 未配置：请设置 EMBEDDINGS_API_KEY')
  return model.embedQuery(text)
}

/** 批量文本向量化 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingsModel()
  if (!model) throw new Error('Embedding 未配置：请设置 EMBEDDINGS_API_KEY 或 OPENAI_API_KEY')
  return model.embedDocuments(texts)
}
