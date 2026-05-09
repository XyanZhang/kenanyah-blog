import { throwIfAborted } from '../lib/abort'
import {
  searchSemanticAll,
  type UnifiedSearchHit,
} from '../lib/semantic-search'
import { searchYijingKnowledge, type YijingSearchHit } from '../lib/yijing-knowledge'
import { searchZiweiKnowledge, type ZiweiSearchHit } from '../lib/ziwei-knowledge'
import { type ChatToolCall } from '../agents/chat-coordinator-agents'

function isKnowledgeBaseToolCall(
  toolCall: ChatToolCall
): toolCall is Extract<ChatToolCall, { tool: 'knowledge_base_search' | 'yijing_knowledge_search' | 'ziwei_knowledge_search' }> {
  return toolCall.tool === 'knowledge_base_search' || toolCall.tool === 'yijing_knowledge_search' || toolCall.tool === 'ziwei_knowledge_search'
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

function formatSourceLabel(hit: UnifiedSearchHit): string {
  if (hit.type === 'post') {
    return `博客文章:${hit.slug ?? hit.postId ?? ''}`
  }

  if (hit.type === 'conversation') {
    return `历史对话:${hit.conversationId ?? ''}`
  }

  if (hit.type === 'pdf') {
    return `PDF:${hit.documentId}#${hit.chunkIndex}`
  }

  if (hit.type === 'thought') {
    return `思考:${hit.thoughtId}`
  }

  if (hit.type === 'bookmark') {
    return `收藏:${hit.bookmarkId}`
  }

  if (hit.type === 'project') {
    return `项目:${hit.projectId}`
  }

  return '未知来源'
}

function mapHit(hit: UnifiedSearchHit): ChatToolHit {
  return {
    source: formatSourceLabel(hit),
    title: hit.title,
    snippet: hit.snippet.trim().slice(0, 280),
    score: Number(hit.score),
  }
}

function mapYijingHit(hit: YijingSearchHit): ChatToolHit {
  return {
    source: `易经:${hit.sourceId}#${hit.chunkIndex}`,
    title: hit.title,
    snippet: hit.snippet.trim().slice(0, 280),
    score: Number(hit.score),
  }
}

function mapZiweiHit(hit: ZiweiSearchHit): ChatToolHit {
  return {
    source: `紫微斗数:${hit.sourceId}#${hit.chunkIndex}`,
    title: hit.sectionTitle ? `${hit.title} / ${hit.sectionTitle}` : hit.title,
    snippet: hit.snippet.trim().slice(0, 280),
    score: Number(hit.score),
  }
}

export async function executeChatToolCall(
  toolCall: ChatToolCall,
  signal?: AbortSignal
): Promise<ChatToolExecutionResult> {
  throwIfAborted(signal)

  if (
    toolCall.tool !== 'knowledge_base_search' &&
    toolCall.tool !== 'yijing_knowledge_search' &&
    toolCall.tool !== 'ziwei_knowledge_search'
  ) {
    throw new Error(`暂不支持的工具: ${toolCall.tool}`)
  }

  const hits =
    toolCall.tool === 'yijing_knowledge_search'
      ? await searchYijingKnowledge(toolCall.query, { limit: toolCall.limit })
      : toolCall.tool === 'ziwei_knowledge_search'
      ? await searchZiweiKnowledge(toolCall.query, { limit: toolCall.limit })
      : await searchSemanticAll(toolCall.query, toolCall.limit)
  throwIfAborted(signal)

  return {
    tool: toolCall.tool,
    query: toolCall.query,
    limit: toolCall.limit,
    reason: toolCall.reason,
    hitCount: hits.length,
    hits: toolCall.tool === 'yijing_knowledge_search'
      ? (hits as YijingSearchHit[]).map(mapYijingHit)
      : toolCall.tool === 'ziwei_knowledge_search'
      ? (hits as ZiweiSearchHit[]).map(mapZiweiHit)
      : (hits as UnifiedSearchHit[]).map(mapHit),
  }
}

export async function executeChatToolCalls(
  toolCalls: ChatToolCall[],
  signal?: AbortSignal
): Promise<ChatToolExecutionResult[]> {
  const seen = new Set<string>()
  const uniqueToolCalls: Extract<ChatToolCall, { tool: 'knowledge_base_search' | 'yijing_knowledge_search' | 'ziwei_knowledge_search' }>[] = []

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
