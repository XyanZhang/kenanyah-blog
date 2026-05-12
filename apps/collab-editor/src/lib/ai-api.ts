import { blogApiUrl } from './env'

type AiTextResponse = {
  success: boolean
  data?: { text: string }
  error?: string
}

export type AiBlockAction = 'continue' | 'rewrite' | 'summarize'

export async function generateAiBlock(action: AiBlockAction, text: string): Promise<string> {
  const response = await fetchAiBlock(action, text)

  const payload = (await response.json().catch(() => null)) as AiTextResponse | null
  if (!response.ok || !payload?.success || !payload.data?.text) {
    throw new Error(payload?.error || 'AI 生成失败')
  }

  return payload.data.text.trim()
}

async function fetchAiBlock(action: AiBlockAction, text: string): Promise<Response> {
  try {
    return await fetch(`${blogApiUrl}/collab/ai`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, text }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    throw new Error(`文档 AI 接口无法访问：${message}。请确认 API 服务已启动，且 VITE_BLOG_API_URL 指向正确。`)
  }
}
