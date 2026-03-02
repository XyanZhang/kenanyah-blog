const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getAuthHeaders(): HeadersInit {
  if (typeof document === 'undefined') return {}
  const cookies = document.cookie
  return {
    'Content-Type': 'application/json',
    Cookie: cookies,
  }
}

export type AiRewritePayload = { text: string; style?: string }
export type AiExpandPayload = { text: string }
export type AiShrinkPayload = { text: string; maxLength?: number }
export type AiHeadingsPayload = { content: string }
export type AiSummaryPayload = { content: string }
export type AiGenerateArticlePayload = { keywords: string }

export type AiTextResponse = { success: boolean; data?: { text: string }; error?: string }

/** Non-stream: POST /ai/rewrite, returns full text */
export async function aiRewrite(payload: AiRewritePayload): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/ai/rewrite`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as AiTextResponse
  if (!json.success || !json.data?.text) throw new Error(json.error || '改写失败')
  return json.data.text
}

/** Non-stream: POST /ai/expand */
export async function aiExpand(payload: AiExpandPayload): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/ai/expand`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as AiTextResponse
  if (!json.success || !json.data?.text) throw new Error(json.error || '扩写失败')
  return json.data.text
}

/** Non-stream: POST /ai/shrink */
export async function aiShrink(payload: AiShrinkPayload): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/ai/shrink`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as AiTextResponse
  if (!json.success || !json.data?.text) throw new Error(json.error || '缩写失败')
  return json.data.text
}

/** Non-stream: POST /ai/headings */
export async function aiHeadings(payload: AiHeadingsPayload): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/ai/headings`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as AiTextResponse
  if (!json.success || !json.data?.text) throw new Error(json.error || '生成小标题失败')
  return json.data.text
}

/** Non-stream: POST /ai/summary */
export async function aiSummary(payload: AiSummaryPayload): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/ai/summary`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const json = (await res.json()) as AiTextResponse
  if (!json.success || !json.data?.text) throw new Error(json.error || '生成摘要失败')
  return json.data.text
}

/** Stream: POST /ai/rewrite?stream=true, yields text chunks via SSE */
export async function streamAiRewrite(
  payload: AiRewritePayload,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/ai/rewrite?stream=true`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
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
        const data = line.slice(6) // 保留前后空格，避免打断 Markdown
        const trimmed = data.trim()
        if (!trimmed || trimmed === '[DONE]') continue
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
    if (trimmed && trimmed !== '[DONE]') {
      try {
        const parsed = JSON.parse(trimmed) as { error?: string; content?: string; type?: string }
        if (parsed.error) onError?.(parsed.error)
        else if (parsed.type !== 'start' && typeof parsed.content === 'string') onChunk(parsed.content)
        else onChunk(data)
      } catch {
        onChunk(data)
      }
    }
  }
}

/** Stream: POST /ai/expand?stream=true */
export async function streamAiExpand(
  payload: AiExpandPayload,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void
): Promise<void> {
  await streamAiGeneric(`${API_BASE_URL}/ai/expand`, payload, onChunk, onError)
}

/** Stream: POST /ai/shrink?stream=true */
export async function streamAiShrink(
  payload: AiShrinkPayload,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void
): Promise<void> {
  await streamAiGeneric(`${API_BASE_URL}/ai/shrink`, payload, onChunk, onError)
}

/** Stream: POST /ai/headings?stream=true */
export async function streamAiHeadings(
  payload: AiHeadingsPayload,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void
): Promise<void> {
  await streamAiGeneric(`${API_BASE_URL}/ai/headings`, payload, onChunk, onError)
}

/** Stream: POST /ai/summary?stream=true */
export async function streamAiSummary(
  payload: AiSummaryPayload,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void
): Promise<void> {
  await streamAiGeneric(`${API_BASE_URL}/ai/summary`, payload, onChunk, onError)
}

/** Stream: POST /ai/generate-article?stream=true */
export async function streamAiGenerateArticle(
  payload: AiGenerateArticlePayload,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void
): Promise<void> {
  await streamAiGeneric(`${API_BASE_URL}/ai/generate-article`, payload, onChunk, onError)
}

/** Generic stream consumer: SSE sends raw text in `data:` lines (not JSON). */
async function streamAiGeneric(
  url: string,
  payload: object,
  onChunk: (chunk: string) => void,
  onError?: (err: string) => void
): Promise<void> {
  const res = await fetch(`${url}?stream=true`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
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
        if (!trimmed || trimmed === '[DONE]') continue
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
    if (trimmed && trimmed !== '[DONE]') {
      try {
        const parsed = JSON.parse(trimmed) as { error?: string; content?: string; type?: string }
        if (parsed.error) onError?.(parsed.error)
        else if (parsed.type !== 'start' && typeof parsed.content === 'string') onChunk(parsed.content)
        else onChunk(data)
      } catch {
        onChunk(data)
      }
    }
  }
}
