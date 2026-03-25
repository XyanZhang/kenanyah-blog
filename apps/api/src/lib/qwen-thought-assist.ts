/**
 * 使用阿里云 DashScope「兼容 OpenAI」模式调用千问文本模型，辅助生成/润色「思考」正文。
 * 文档：https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api
 */
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { env } from '../env'

/** 兼容模式路径（与 base 域名拼接，勿与 multimodal-generation 混用） */
const OPENAI_COMPAT_PATH = '/compatible-mode/v1'

function getOpenAICompatBaseUrl(): string {
  const raw = env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com'
  const origin = new URL(raw).origin
  return `${origin}${OPENAI_COMPAT_PATH}`
}

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

/** 生成：略高 temperature 便于联想；润色：略低更稳 */
const TEMP_GENERATE = 0.82
const TEMP_POLISH = 0.55

export type ThoughtAssistMode = 'generate' | 'polish'

export async function assistThoughtWithQwen(input: {
  mode: ThoughtAssistMode
  keywords: string
  draft?: string
}): Promise<string> {
  const apiKey = env.DASHSCOPE_API_KEY
  if (!apiKey) {
    throw new Error(
      'DASHSCOPE_API_KEY 未配置，无法使用千问辅助。请在环境变量中配置百炼 API Key。'
    )
  }

  const keywords = input.keywords.trim()
  const draft = (input.draft ?? '').trim()

  if (input.mode === 'generate' && !keywords) {
    throw new Error('请先填写关键词或想记下的要点')
  }
  if (input.mode === 'polish' && !draft) {
    throw new Error('请先在正文里写好草稿，再使用美化')
  }

  const modelName = env.DASHSCOPE_CHAT_MODEL
  const temperature = input.mode === 'generate' ? TEMP_GENERATE : TEMP_POLISH

  const chat = new ChatOpenAI({
    modelName,
    temperature,
    maxTokens: 2048,
    apiKey,
    configuration: {
      baseURL: getOpenAICompatBaseUrl(),
    },
  })

  const userContent =
    input.mode === 'generate'
      ? `关键词与要点：\n${keywords}`
      : `关键词（供把握语气与主题侧重）：\n${keywords || '（无额外关键词，以草稿为准）'}\n\n草稿：\n${draft}`

  const res = await chat.invoke([
    new SystemMessage(input.mode === 'generate' ? SYSTEM_GENERATE : SYSTEM_POLISH),
    new HumanMessage(userContent),
  ])

  const text =
    typeof res.content === 'string'
      ? res.content
      : Array.isArray(res.content)
        ? res.content
            .map((p) => (typeof p === 'string' ? p : 'text' in p ? String(p.text) : ''))
            .join('')
        : ''
  const out = text.trim()
  if (!out) {
    throw new Error('模型未返回有效正文，请稍后重试')
  }
  return out
}
