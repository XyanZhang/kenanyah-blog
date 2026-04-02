import { invokeChat } from '../lib/llm'

export type PlannerResult = {
  intent: string
  topic?: string
  audience?: string
  tone?: string
  goals?: string[]
  missingFields: string[]
  followupQuestions: string[]
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }
  return text.slice(start, end + 1)
}

export async function runPlannerAgent(
  conversationText: string,
  signal?: AbortSignal
): Promise<PlannerResult> {
  const systemPrompt = [
    '你是博客写作工作流的规划 Agent。',
    '请严格输出 JSON，不要输出其它文本。',
    '目标：从对话中提取生成博客所需信息，并给出缺失字段与追问问题。',
    '必须返回字段：intent, topic, audience, tone, goals, missingFields, followupQuestions。',
    'missingFields 只允许使用：topic, audience, tone, goals。',
    'followupQuestions 用中文，最多 3 个短问题。',
  ].join('\n')

  const userPrompt = `对话内容：\n${conversationText}`
  const raw = await invokeChat(userPrompt, systemPrompt, {
    model: 'reasoning',
    temperature: 0.2,
    signal,
  })
  const jsonText = extractJsonObject(raw)
  if (!jsonText) {
    return {
      intent: 'write_blog',
      missingFields: ['topic'],
      followupQuestions: ['你希望文章聚焦什么主题？'],
    }
  }

  try {
    const parsed = JSON.parse(jsonText) as PlannerResult
    return {
      intent: parsed.intent || 'write_blog',
      topic: parsed.topic,
      audience: parsed.audience,
      tone: parsed.tone,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      followupQuestions: Array.isArray(parsed.followupQuestions) ? parsed.followupQuestions : [],
    }
  } catch {
    return {
      intent: 'write_blog',
      missingFields: ['topic'],
      followupQuestions: ['你希望文章聚焦什么主题？'],
    }
  }
}

export type DraftResult = {
  title: string
  excerpt: string
  content: string
}

export async function runWriterAgent(
  conversationText: string,
  planning: PlannerResult,
  signal?: AbortSignal
): Promise<DraftResult> {
  const systemPrompt = [
    '你是博客写作 Agent。',
    '根据用户需求输出一篇可直接发布的 Markdown 中文文章。',
    '要求：结构清晰（引言、主体分节、总结）、内容真实克制，不编造具体数据。',
    '先输出标题，再输出摘要，再输出正文。',
    '格式必须是 JSON：{"title":"", "excerpt":"", "content":""}',
  ].join('\n')

  const userPrompt = JSON.stringify({
    planning,
    conversationText,
  })

  const raw = await invokeChat(userPrompt, systemPrompt, {
    model: 'default',
    temperature: 0.6,
    signal,
  })
  const jsonText = extractJsonObject(raw)
  if (!jsonText) {
    throw new Error('writer agent 返回格式无效')
  }

  let parsed: DraftResult
  try {
    parsed = JSON.parse(jsonText) as DraftResult
  } catch {
    throw new Error('writer agent 返回 JSON 无法解析')
  }
  if (!parsed.title || !parsed.content) {
    throw new Error('writer agent 返回内容不完整')
  }

  return {
    title: parsed.title.trim(),
    excerpt: (parsed.excerpt || '').trim(),
    content: parsed.content.trim(),
  }
}

export async function runEditorAgent(draft: DraftResult, signal?: AbortSignal): Promise<DraftResult> {
  const systemPrompt = [
    '你是博客编辑 Agent。',
    '任务：润色标题、摘要、正文，确保语气统一、段落清晰、可读性高。',
    '不要改变核心观点，不要新增未经证实的事实。',
    '输出必须是 JSON：{"title":"", "excerpt":"", "content":""}',
  ].join('\n')

  const raw = await invokeChat(JSON.stringify(draft), systemPrompt, {
    model: 'default',
    temperature: 0.3,
    signal,
  })
  const jsonText = extractJsonObject(raw)
  if (!jsonText) {
    return draft
  }

  try {
    const edited = JSON.parse(jsonText) as DraftResult
    return {
      title: edited.title?.trim() || draft.title,
      excerpt: edited.excerpt?.trim() || draft.excerpt,
      content: edited.content?.trim() || draft.content,
    }
  } catch {
    return draft
  }
}
