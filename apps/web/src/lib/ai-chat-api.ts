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

export type ChatUserFacingStatus =
  | 'thinking'
  | 'searching'
  | 'organizing'
  | 'creating'
  | 'responding'

export type ChatStatusMode = 'chat' | 'workflow'

export type ChatStreamEvent =
  | { type: 'start' }
  | {
      type: 'status'
      status: ChatUserFacingStatus
      label: string
    }
  | { type: 'followup'; questions: string[] }
  | { type: 'content'; content: string }

export type BlogWorkflowResult =
  | {
      status: 'need_more_info'
      followupQuestions: string[]
    }
  | {
      status: 'published' | 'draft_saved'
      post: {
        id: string
        slug: string
        title: string
        published: boolean
      }
      postUrl: string
    }

export type BlogWorkflowStreamEvent =
  | { type: 'start' }
  | {
      type: 'status'
      stage: 'plan' | 'ask_followup' | 'write' | 'edit' | 'save'
      status: ChatUserFacingStatus
      label: string
    }
  | { type: 'result'; result: BlogWorkflowResult }
  | { type: 'cancelled' }

export type ChatProgressState = {
  mode: ChatStatusMode
  status: ChatUserFacingStatus
  label: string
}

export function toChatProgressState(
  event: ChatStreamEvent | BlogWorkflowStreamEvent
): ChatProgressState | null {
  if (event.type !== 'status') {
    return null
  }

  if ('stage' in event) {
    return {
      mode: 'workflow',
      status: event.status,
      label: event.label,
    }
  }

  return {
    mode: 'chat',
    status: event.status,
    label: event.label,
  }
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

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<unknown>
  if (!res.ok || !json.success) {
    throw new Error(json.error || '删除会话失败')
  }
}

export async function streamChatMessage(
  conversationId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void,
  options?: {
    useKnowledgeBase?: boolean
    signal?: AbortSignal
    onEvent?: (event: ChatStreamEvent) => void
  }
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/chat/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
    {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      signal: options?.signal,
      body: JSON.stringify({ content, useKnowledgeBase: options?.useKnowledgeBase === true }),
    }
  )

  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    const message = err.error || '请求失败'
    onError?.(message)
    throw new Error(message)
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
        let parsed: (ChatStreamEvent & { error?: string }) | null = null
        try {
          parsed = JSON.parse(trimmed) as ChatStreamEvent & { error?: string }
        } catch {
          onChunk(data)
          continue
        }

        if (parsed.error) {
          onError?.(parsed.error)
          throw new Error(parsed.error)
        }

        options?.onEvent?.(parsed)
        if (parsed.type === 'content' && typeof parsed.content === 'string') {
          onChunk(parsed.content)
        }
      }
    }
  }

  if (buffer.startsWith('data: ')) {
    const data = buffer.slice(6)
    const trimmed = data.trim()
    if (!trimmed) return
    if (trimmed === '[DONE]') return
    let parsed: (ChatStreamEvent & { error?: string }) | null = null
    try {
      parsed = JSON.parse(trimmed) as ChatStreamEvent & { error?: string }
    } catch {
      onChunk(data)
      return
    }

    if (parsed.error) {
      onError?.(parsed.error)
      throw new Error(parsed.error)
    }

    options?.onEvent?.(parsed)
    if (parsed.type === 'content' && typeof parsed.content === 'string') {
      onChunk(parsed.content)
    }
  }
}

export async function runBlogWorkflow(payload: {
  conversationId: string
  message: string
  publishDirectly?: boolean
}): Promise<BlogWorkflowResult> {
  const res = await fetch(`${API_BASE_URL}/blog-workflow/run`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as ApiResponse<BlogWorkflowResult>
  if (!json.success || !json.data) {
    throw new Error(json.error || '博客工作流执行失败')
  }
  return json.data
}

export async function streamBlogWorkflow(
  payload: {
    conversationId: string
    message: string
    publishDirectly?: boolean
  },
  handlers: {
    onEvent?: (event: BlogWorkflowStreamEvent) => void
    onResult?: (result: BlogWorkflowResult) => void
    onError?: (err: string) => void
  },
  options?: { signal?: AbortSignal }
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/blog-workflow/run/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    signal: options?.signal,
    body: JSON.stringify(payload),
  })

  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    const message = err.error || '博客工作流执行失败'
    handlers.onError?.(message)
    throw new Error(message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = (line: string) => {
    if (!line.startsWith('data: ')) {
      return
    }

    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') {
      return
    }

    let parsed: (BlogWorkflowStreamEvent & { error?: string }) | null = null
    try {
      parsed = JSON.parse(data) as BlogWorkflowStreamEvent & { error?: string }
    } catch {
      return
    }

    if (parsed.error) {
      handlers.onError?.(parsed.error)
      throw new Error(parsed.error)
    }

    handlers.onEvent?.(parsed)
    if (parsed.type === 'result') {
      handlers.onResult?.(parsed.result)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      handleLine(line)
    }
  }

  if (buffer) {
    handleLine(buffer)
  }
}

export async function cancelBlogWorkflow(payload: { conversationId: string }): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/blog-workflow/cancel`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as ApiResponse<{ cancelled: boolean }>
  if (!json.success || !json.data) {
    throw new Error(json.error || '取消博客工作流失败')
  }
  return json.data.cancelled
}

/** 语音文件上传结果 */
export interface VoiceUploadResult {
  fileId: string
  url: string
  size: number
  mime: string
}

/** 语音转文本结果 */
export interface TranscriptionResult {
  text: string
  fileId: string
}

/**
 * 上传语音文件
 * @param blob 音频 Blob 对象
 * @returns 上传结果：{ fileId, url, size, mime }
 */
export async function uploadVoiceFile(blob: Blob): Promise<VoiceUploadResult> {
  const formData = new FormData()
  formData.append('file', blob, 'recording.webm')

  const res = await fetch(`${API_BASE_URL}/voice/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const json = (await res.json()) as ApiResponse<VoiceUploadResult>
  if (!json.success || !json.data) {
    throw new Error(json.error || '语音上传失败')
  }
  return json.data
}

/**
 * 语音转文本
 * @param fileId 文件 ID
 * @param modelName 可选：指定 Whisper 模型
 * @returns 转写结果：{ text, fileId }
 */
export async function transcribeVoice(
  fileId: string,
  modelName?: string
): Promise<TranscriptionResult> {
  const res = await fetch(`${API_BASE_URL}/voice/transcribe`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fileId, modelName }),
  })

  const json = (await res.json()) as ApiResponse<TranscriptionResult>
  if (!json.success || !json.data) {
    throw new Error(json.error || '语音识别失败')
  }
  return json.data
}
