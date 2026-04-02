export const OPERATION_CARD_PREFIX = '【OPERATION_CARD】'
const LEGACY_WORKFLOW_FOLLOWUP_PREFIX = '【BLOG_WORKFLOW_FOLLOWUP】'

export type OperationCardAction =
  | {
      type: 'send_message'
      label: string
      message: string
      mode: 'chat' | 'workflow'
      style?: 'primary' | 'secondary' | 'danger'
    }
  | {
      type: 'open_url'
      label: string
      url: string
      style?: 'secondary' | 'ghost'
    }

export type OperationCardDetail = {
  label: string
  value: string
}

export type FollowupOperationCard = {
  version: 1
  kind: 'followup'
  scope: 'chat' | 'workflow' | 'tool'
  title: string
  description?: string
  questions: string[]
  submitMode: 'chat' | 'workflow'
  submitLabel?: string
  inputPlaceholder?: string
  defaultReplyLabel?: string
  defaultReplyMessage?: string
  quickReplies?: string[]
}

export type ConfirmOperationCard = {
  version: 1
  kind: 'confirm'
  scope: 'delete_post'
  title: string
  description?: string
  emphasis?: 'danger'
  details: OperationCardDetail[]
  actions: OperationCardAction[]
}

export type OperationCard = FollowupOperationCard | ConfirmOperationCard

function normalizeQuestions(questions: string[]): string[] {
  return questions.map((question) => question.trim()).filter(Boolean).slice(0, 5)
}

function stringifyOperationCard(card: OperationCard): string {
  return `${OPERATION_CARD_PREFIX}\n${JSON.stringify(card)}`
}

export function buildWorkflowDefaultReplyMessage(questions: string[]): string {
  return `以下问题我没有额外要求，请你按合理默认值自行补全并继续生成，不必再次提问：\n${questions
    .map((question, index) => `${index + 1}. ${question}`)
    .join('\n')}`
}

export function buildWorkflowFollowupOperationCardMessage(
  followupQuestions: string[],
  options?: { phase?: 'start' | 'continue' }
): string {
  const questions = normalizeQuestions(followupQuestions)
  const phaseText = options?.phase === 'continue' ? '继续生成前' : '开始生成前'

  return stringifyOperationCard({
    version: 1,
    kind: 'followup',
    scope: 'workflow',
    title: '博客工作流需要补充信息',
    description: `在${phaseText}，请先补充以下信息。`,
    questions,
    submitMode: 'workflow',
    submitLabel: '按所选继续生成',
    inputPlaceholder: '补充具体要求；未说明的细节会按合理默认值处理',
    defaultReplyLabel: '全部按默认继续',
    defaultReplyMessage: buildWorkflowDefaultReplyMessage(questions),
  })
}

function parseLegacyWorkflowFollowup(content: string): FollowupOperationCard | null {
  if (!content.includes(LEGACY_WORKFLOW_FOLLOWUP_PREFIX)) {
    return null
  }

  const body = content.replace(LEGACY_WORKFLOW_FOLLOWUP_PREFIX, '').trim()
  const questions = normalizeQuestions(
    body
      .split('\n')
      .map((line) => line.trim())
      .map((line) => line.replace(/^\d+\.\s*/, ''))
      .filter(
        (line) =>
          Boolean(line) &&
          !line.startsWith('在开始生成前') &&
          !line.startsWith('在继续生成前')
      )
  )

  return {
    version: 1,
    kind: 'followup',
    scope: 'workflow',
    title: '博客工作流需要补充信息',
    description: body.split('\n')[0]?.trim() || '请先补充以下信息。',
    questions,
    submitMode: 'workflow',
    submitLabel: '按所选继续生成',
    inputPlaceholder: '补充具体要求；未说明的细节会按合理默认值处理',
    defaultReplyLabel: '全部按默认继续',
    defaultReplyMessage: buildWorkflowDefaultReplyMessage(questions),
  }
}

export function parseOperationCardContent(content: string): OperationCard | null {
  const legacyCard = parseLegacyWorkflowFollowup(content)
  if (legacyCard) {
    return legacyCard
  }

  if (!content.startsWith(OPERATION_CARD_PREFIX)) {
    return null
  }

  const jsonText = content.slice(OPERATION_CARD_PREFIX.length).trim()
  if (!jsonText) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonText) as OperationCard
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function isWorkflowOperationCardContent(content: string): boolean {
  const card = parseOperationCardContent(content)
  return card?.kind === 'followup' && card.submitMode === 'workflow'
}
