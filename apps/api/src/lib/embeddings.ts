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
  if (texts.length === 0) return []

  // 部分 OpenAI 兼容 Embeddings 接口会限制批量大小（例如 DashScope text-embedding-v4 <= 10）。
  // 这里统一做分批，避免上层调用（如 PDF 索引）一次性塞入过多文本导致 400。
  const MAX_BATCH = 10
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH)
    // 顺序执行更稳（避免并发触发限流/队列）
    const vectors = await model.embedDocuments(batch)
    out.push(...vectors)
  }
  return out
}
