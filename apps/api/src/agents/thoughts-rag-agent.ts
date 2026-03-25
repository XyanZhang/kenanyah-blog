import { randomBytes } from 'node:crypto'
import { prisma } from '../lib/db'
import { embedDocuments, embedQuery, getEmbeddingsModel } from '../lib/embeddings'
import { invokeChat } from '../lib/llm'

const CHUNK_MAX_LEN = 2000

function vectorToPgString(vec: number[]): string {
  return `[${vec.join(',')}]`
}

export type ThoughtRagHit = {
  thoughtId: string
  title: string
  snippet: string
  score: number
}

export type ThoughtRagAnswer = {
  answer: string
  hits: ThoughtRagHit[]
}

export class ThoughtsRagAgent {
  buildIndexText(thought: { id: string; content: string; createdAt: Date }): string {
    const date = thought.createdAt.toISOString().slice(0, 10)
    const body = thought.content.slice(0, CHUNK_MAX_LEN)
    return `类型：思考\n日期：${date}\n内容：${body}`
  }

  async indexThought(thoughtId: string): Promise<void> {
    const model = getEmbeddingsModel()
    if (!model) return

    const thought = await prisma.thought.findUnique({
      where: { id: thoughtId },
      select: { id: true, content: true, createdAt: true },
    })
    if (!thought) return

    await (prisma as any).$executeRawUnsafe(
      'DELETE FROM thought_embeddings WHERE thought_id = $1',
      thoughtId
    )

    const text = this.buildIndexText(thought)
    const vectors = await embedDocuments([text])
    const embedding = vectors[0]
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Embedding API 返回格式异常，无法写入 thought_embeddings')
    }

    const id = `te_${randomBytes(12).toString('hex')}`
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO thought_embeddings (id, thought_id, chunk_index, content, embedding)
       VALUES ($1, $2, 0, $3, $4::vector)`,
      id,
      thoughtId,
      text,
      vectorToPgString(embedding)
    )
  }

  async removeThoughtFromIndex(thoughtId: string): Promise<void> {
    await (prisma as any).$executeRawUnsafe(
      'DELETE FROM thought_embeddings WHERE thought_id = $1',
      thoughtId
    )
  }

  async search(query: string, limit: number = 10): Promise<ThoughtRagHit[]> {
    const model = getEmbeddingsModel()
    if (!model) {
      throw new Error('OPENAI_API_KEY is not configured for semantic search')
    }

    const queryVector = await embedQuery(query)
    const vectorStr = vectorToPgString(queryVector)

    type Row = { thought_id: string; content: string; score: number }
    const rows = (await (prisma as any).$queryRawUnsafe(
      `SELECT te.thought_id, te.content,
              1 - (te.embedding <=> $1::vector) AS score
       FROM thought_embeddings te
       ORDER BY te.embedding <=> $1::vector
       LIMIT $2`,
      vectorStr,
      limit
    )) as Row[]

    if (rows.length === 0) return []

    const ids = [...new Set(rows.map((r) => r.thought_id))]
    const thoughts = await prisma.thought.findMany({
      where: { id: { in: ids } },
      select: { id: true, content: true, createdAt: true },
    })
    const thoughtMap = new Map(thoughts.map((t) => [t.id, t]))

    return rows
      .filter((r) => thoughtMap.has(r.thought_id))
      .map((r) => {
        const t = thoughtMap.get(r.thought_id)!
        const date = t.createdAt.toISOString().slice(0, 10)
        const snippet = t.content.slice(0, 180).replace(/\s+/g, ' ')
        return {
          thoughtId: r.thought_id,
          title: `思考 · ${date}`,
          snippet,
          score: Number(r.score),
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  async answer(query: string, limit: number = 6): Promise<ThoughtRagAnswer> {
    const hits = await this.search(query, limit)
    if (hits.length === 0) {
      return { answer: '我在思考库里没有检索到相关内容。', hits }
    }

    const context = hits
      .map((h, i) => `[#${i + 1}] ${h.title}\n${h.snippet}`)
      .join('\n\n')

    const systemPrompt =
      '你是一个基于「思考库」做回答的中文助手。只使用给定的检索片段作答；若信息不足，直接说明不足，不要编造。输出简洁、可执行。'

    const userPrompt = `用户问题：${query}\n\n检索片段：\n${context}\n\n请给出答案：`
    const answer = (await invokeChat(userPrompt, systemPrompt, { model: 'reasoning' })).trim()
    return { answer, hits }
  }
}

