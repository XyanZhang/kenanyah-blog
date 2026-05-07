import type { DivinationConsultationDto } from '@blog/types'
import type { CreateDivinationConsultationInput } from '@blog/validation'
import { invokeChat } from '../lib/llm'

const modeLabels: Record<CreateDivinationConsultationInput['mode'], string> = {
  daily: '通书择日',
  bazi: '八字参考',
  name: '姓名灵感',
  event: '事项占断',
}

const questionTypeLabels: Record<CreateDivinationConsultationInput['questionType'], string> = {
  career: '事业',
  relationship: '情感',
  wealth: '财运',
  health: '健康',
  travel: '出行',
  general: '综合',
}

function buildSystemPrompt(): string {
  return [
    '你是一个谨慎的中文命理文化参考 Agent。',
    '当前没有接入资料库检索，所以不能声称引用了古籍、资料库、章节或外部来源。',
    '不要把命理结论说成绝对事实；遇到健康、法律、财务问题，只给低风险生活建议，并提醒咨询专业人士。',
    '回答控制在 500 字以内，结构为：核心参考、判断依据、行动建议、风险提醒。',
  ].join('\n')
}

function buildUserPrompt(input: CreateDivinationConsultationInput): string {
  return [
    `解读模式：${modeLabels[input.mode]}`,
    `问题类型：${questionTypeLabels[input.questionType]}`,
    `目标日期：${input.targetDate ?? '未指定'}`,
    `出生/背景信息：${input.birthInfo || '未填写'}`,
    `已选资料源 ID：${input.sourceIds.length > 0 ? input.sourceIds.join(', ') : '未选择'}`,
    '',
    `用户问题：${input.question}`,
    '',
    '请直接输出中文 Markdown，不要输出 JSON。',
  ].join('\n')
}

export async function runDivinationConsultationAgent(
  input: CreateDivinationConsultationInput,
  signal?: AbortSignal
): Promise<DivinationConsultationDto> {
  const answer = (
    await invokeChat(buildUserPrompt(input), buildSystemPrompt(), {
      model: 'fast',
      temperature: 0.5,
      maxTokens: 900,
      signal,
    })
  ).trim()

  return {
    id: `ai-${Date.now()}`,
    mode: input.mode,
    questionType: input.questionType,
    question: input.question,
    targetDate: input.targetDate,
    answer,
    citations: [],
    status: 'generated',
    createdAt: new Date().toISOString(),
  }
}
