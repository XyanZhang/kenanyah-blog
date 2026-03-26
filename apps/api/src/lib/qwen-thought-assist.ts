/**
 * 「思考」辅助：走统一 LLM 层，强制使用千问（DashScope 兼容模式），
 * 模型名与前缀 temperature 仍由本模块收口，便于产品侧调参。
 */
import { env } from '../env'
import { invokeChat } from './llm'

const SYSTEM_GENERATE = [
  '你是中文写作助手，帮用户把「关键词或碎片想法」写成一条适合发在「思考流」里的随笔。',
  '要求：语气自然、偏第一人称或随口记录；长度适中（约 120～450 字）；可 1～4 个短段落。',
  '不要标题；不要 Markdown 标题符号；不要用 #话题#；不要套话空话；少用条目列表，除非节奏上真的需要。',
  '只输出正文，不要解释或前缀。',
].join('\n')

const SYSTEM_POLISH = [
  '你是中文写作助手。用户会提供「关键词」和一段「草稿」，请在尽量保留核心意思的前提下润色。',
  '要求：更通顺、更有画面或节奏；仍像朋友圈随笔，不要写成论文；不要标题；不要 Markdown。',
  '只输出润色后的正文，不要解释。',
].join('\n')

/** 生成：略高 temperature；美化：略低更稳 */
const TEMP_GENERATE = 0.82
const TEMP_POLISH = 0.55

export type ThoughtAssistMode = 'generate' | 'polish'

export async function assistThoughtWithQwen(input: {
  mode: ThoughtAssistMode
  keywords: string
  draft?: string
}): Promise<string> {
  const keywords = input.keywords.trim()
  const draft = (input.draft ?? '').trim()

  if (input.mode === 'generate' && !keywords) {
    throw new Error('请先填写关键词或想记下的要点')
  }
  if (input.mode === 'polish' && !draft) {
    throw new Error('请先在正文里写好草稿，再使用美化')
  }

  const userContent =
    input.mode === 'generate'
      ? `关键词与要点：\n${keywords}`
      : `关键词（供把握语气与主题侧重）：\n${keywords || '（无额外关键词，以草稿为准）'}\n\n草稿：\n${draft}`

  const systemPrompt = input.mode === 'generate' ? SYSTEM_GENERATE : SYSTEM_POLISH
  const temperature = input.mode === 'generate' ? TEMP_GENERATE : TEMP_POLISH

  const text = (
    await invokeChat(userContent, systemPrompt, {
      provider: 'qwen',
      model: env.DASHSCOPE_CHAT_MODEL,
      temperature,
      maxTokens: 2048,
    })
  ).trim()

  if (!text) {
    throw new Error('模型未返回有效正文，请稍后重试')
  }
  return text
}
