import { getApiBaseUrl } from './api-client'

const API_BASE_URL = getApiBaseUrl()

function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  }
}

export interface ChatConversation {
  id: string
  title: string | null
  userId: string | null
  messageCount: number
  lastMessageAt: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | string
  content: string
  createdAt: string
}

export interface ChatConversationDetail {
  conversation: ChatConversation
  messages: ChatMessage[]
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export async function listConversations(): Promise<ChatConversation[]> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  })
  const json = (await res.json()) as ApiResponse<ChatConversation[]>
  if (!json.success || !json.data) {
    throw new Error(json.error || '加载会话失败')
  }
  return json.data
}

export async function createConversation(initialMessage?: string): Promise<ChatConversation> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ initialMessage }),
  })
  const json = (await res.json()) as ApiResponse<ChatConversation>
  if (!json.success || !json.data) {
    throw new Error(json.error || '创建会话失败')
  }
  return json.data
}

export async function getConversation(id: string): Promise<ChatConversationDetail> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${encodeURIComponent(id)}`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  })
  const json = (await res.json()) as ApiResponse<ChatConversationDetail>
  if (!json.success || !json.data) {
    throw new Error(json.error || '加载会话详情失败')
  }
  return json.data
}

export async function updateConversation(
  id: string,
  payload: { title: string }
): Promise<ChatConversation> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as ApiResponse<ChatConversation>
  if (!json.success || !json.data) {
    throw new Error(json.error || '更新会话失败')
  }
  return json.data
}

export async function streamChatMessage(
  conversationId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void,
  options?: { useKnowledgeBase?: boolean }
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/chat/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
    {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, useKnowledgeBase: options?.useKnowledgeBase === true }),
    }
  )

  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    onError?.(err.error || '请求失败')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        const trimmed = data.trim()
        if (!trimmed) continue
        if (trimmed === '[DONE]') {
          return
        }
        try {
          const parsed = JSON.parse(trimmed) as { error?: string; content?: string; type?: string }
          if (parsed.error) {
            onError?.(parsed.error)
            return
          }
          if (parsed.type === 'start') continue
          if (typeof parsed.content === 'string') {
            onChunk(parsed.content)
          }
        } catch {
          onChunk(data)
        }
      }
    }
  }

  if (buffer.startsWith('data: ')) {
    const data = buffer.slice(6)
    const trimmed = data.trim()
    if (!trimmed) return
    if (trimmed === '[DONE]') return
    try {
      const parsed = JSON.parse(trimmed) as { error?: string; content?: string; type?: string }
      if (parsed.error) {
        onError?.(parsed.error)
      } else if (parsed.type !== 'start' && typeof parsed.content === 'string') {
        onChunk(parsed.content)
      } else {
        onChunk(data)
      }
    } catch {
      onChunk(data)
    }
  }
}

