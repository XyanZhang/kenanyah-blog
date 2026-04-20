import { throwIfAborted } from '../lib/abort'
import {
  searchSemanticAll,
  type PdfSemanticHit,
  type SemanticSearchHit,
} from '../lib/semantic-search'
import { type ChatToolCall } from '../agents/chat-coordinator-agents'

function isKnowledgeBaseToolCall(
  toolCall: ChatToolCall
): toolCall is Extract<ChatToolCall, { tool: 'knowledge_base_search' }> {
  return toolCall.tool === 'knowledge_base_search'
}

export type ChatToolHit = {
  source: string
  title: string
  snippet: string
  score: number
}

export type ChatToolExecutionResult = {
  tool: ChatToolCall['tool']
  query: string
  limit: number
  reason: string
  hitCount: number
  hits: ChatToolHit[]
}

function formatSourceLabel(hit: SemanticSearchHit | PdfSemanticHit): string {
  if (hit.type === 'post') {
    return `博客文章:${hit.slug ?? hit.postId ?? ''}`
  }

  if (hit.type === 'conversation') {
    return `历史对话:${hit.conversationId ?? ''}`
  }

  if (hit.type === 'pdf') {
    return `PDF:${hit.documentId}#${hit.chunkIndex}`
  }

  return '未知来源'
}

function mapHit(hit: SemanticSearchHit | PdfSemanticHit): ChatToolHit {
  return {
    source: formatSourceLabel(hit),
    title: hit.title,
    snippet: hit.snippet.trim().slice(0, 280),
    score: Number(hit.score),
  }
}

export async function executeChatToolCall(
  toolCall: ChatToolCall,
  signal?: AbortSignal
): Promise<ChatToolExecutionResult> {
  throwIfAborted(signal)

  if (toolCall.tool !== 'knowledge_base_search') {
    throw new Error(`暂不支持的工具: ${toolCall.tool}`)
  }

  const hits = await searchSemanticAll(toolCall.query, toolCall.limit)
  throwIfAborted(signal)

  return {
    tool: toolCall.tool,
    query: toolCall.query,
    limit: toolCall.limit,
    reason: toolCall.reason,
    hitCount: hits.length,
    hits: hits.map(mapHit),
  }
}

export async function executeChatToolCalls(
  toolCalls: ChatToolCall[],
  signal?: AbortSignal
): Promise<ChatToolExecutionResult[]> {
  const seen = new Set<string>()
  const uniqueToolCalls: Extract<ChatToolCall, { tool: 'knowledge_base_search' }>[] = []

  for (const toolCall of toolCalls.filter(isKnowledgeBaseToolCall)) {
    const cacheKey = `${toolCall.tool}:${toolCall.query.trim().toLowerCase()}`
    if (seen.has(cacheKey)) {
      continue
    }
    seen.add(cacheKey)
    uniqueToolCalls.push(toolCall)
  }

  return Promise.all(uniqueToolCalls.map((toolCall) => executeChatToolCall(toolCall, signal)))
}
