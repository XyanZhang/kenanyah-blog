export const OPERATION_CARD_PREFIX = '【OPERATION_CARD】'

type OperationCardAction =
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

type OperationCardDetail = {
  label: string
  value: string
}

type FollowupOperationCard = {
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

type ConfirmOperationCard = {
  version: 1
  kind: 'confirm'
  scope: 'delete_post'
  title: string
  description?: string
  emphasis?: 'danger'
  details: OperationCardDetail[]
  actions: OperationCardAction[]
}

type OperationCard = FollowupOperationCard | ConfirmOperationCard

function stringifyOperationCard(card: OperationCard): string {
  return `${OPERATION_CARD_PREFIX}\n${JSON.stringify(card)}`
}

export function buildWorkflowDefaultReplyMessage(questions: string[]): string {
  return `以下问题我没有额外要求，请你按合理默认值自行补全并继续生成，不必再次提问：\n${questions
    .map((question, index) => `${index + 1}. ${question}`)
    .join('\n')}`
}

export function buildFollowupOperationCardMessage(input: {
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
}): string {
  const questions = input.questions.map((question) => question.trim()).filter(Boolean).slice(0, 5)

  return stringifyOperationCard({
    version: 1,
    kind: 'followup',
    scope: input.scope,
    title: input.title,
    description: input.description?.trim() || undefined,
    questions,
    submitMode: input.submitMode,
    submitLabel: input.submitLabel?.trim() || undefined,
    inputPlaceholder: input.inputPlaceholder?.trim() || undefined,
    defaultReplyLabel: input.defaultReplyLabel?.trim() || undefined,
    defaultReplyMessage: input.defaultReplyMessage?.trim() || undefined,
    quickReplies: input.quickReplies?.map((item) => item.trim()).filter(Boolean).slice(0, 6),
  })
}

export function buildWorkflowFollowupOperationCardMessage(
  followupQuestions: string[],
  options?: { phase?: 'start' | 'continue' }
): string {
  const phaseText = options?.phase === 'continue' ? '继续生成前' : '开始生成前'

  return buildFollowupOperationCardMessage({
    scope: 'workflow',
    title: '博客工作流需要补充信息',
    description: `在${phaseText}，请先补充以下信息。`,
    questions: followupQuestions,
    submitMode: 'workflow',
    submitLabel: '按所选继续生成',
    inputPlaceholder: '补充具体要求；未说明的细节会按合理默认值处理',
    defaultReplyLabel: '全部按默认继续',
    defaultReplyMessage: buildWorkflowDefaultReplyMessage(followupQuestions),
  })
}

export function buildDeletePostConfirmOperationCardMessage(input: {
  postId: string
  title: string
  statusLabel: string
  postUrl: string
  editUrl: string
}): string {
  return stringifyOperationCard({
    version: 1,
    kind: 'confirm',
    scope: 'delete_post',
    title: '确认删除文章',
    description: '删除后无法恢复。请先查看原文或原始数据，再确认是否继续。',
    emphasis: 'danger',
    details: [
      { label: '标题', value: input.title },
      { label: '删除对象 ID', value: input.postId },
      { label: '状态', value: input.statusLabel },
    ],
    actions: [
      {
        type: 'open_url',
        label: '查看原文',
        url: input.postUrl,
        style: 'ghost',
      },
      {
        type: 'open_url',
        label: '查看原始数据',
        url: input.editUrl,
        style: 'secondary',
      },
      {
        type: 'send_message',
        label: '确认删除',
        message: `确认删除 ${input.postId}`,
        mode: 'chat',
        style: 'danger',
      },
      {
        type: 'send_message',
        label: '取消',
        message: `取消删除 ${input.postId}`,
        mode: 'chat',
        style: 'secondary',
      },
    ],
  })
}
