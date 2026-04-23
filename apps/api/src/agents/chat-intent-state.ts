export type IntentDomain =
  | 'general'
  | 'knowledge'
  | 'blog_workflow'
  | 'content_management'
  | 'calendar_planning'
  | 'bookmark_management'
  | 'thoughts_memory'

export type PendingIntentAction =
  | 'blog_workflow_followup'
  | 'update_post_followup'
  | 'confirm_delete_post'
  | 'confirm_calendar_plan'
  | 'tool_followup'

export type PendingIntentEntityType =
  | 'post'
  | 'calendar_event'
  | 'bookmark'
  | 'thought'
  | 'workflow'

export type IntentContext = {
  activeDomain: IntentDomain
  pendingAction: PendingIntentAction | null
  pendingEntityType: PendingIntentEntityType | null
  pendingEntityId: string | null
  lastShownPostId: string | null
  lastOperationCardScope: 'chat' | 'workflow' | 'tool' | 'delete_post' | 'calendar_schedule' | null
  lastUserGoalSummary: string | null
  confidenceMode: 'normal' | 'cautious'
}

export const DEFAULT_INTENT_CONTEXT: IntentContext = {
  activeDomain: 'general',
  pendingAction: null,
  pendingEntityType: null,
  pendingEntityId: null,
  lastShownPostId: null,
  lastOperationCardScope: null,
  lastUserGoalSummary: null,
  confidenceMode: 'normal',
}

function isIntentDomain(value: unknown): value is IntentDomain {
  return (
    value === 'general' ||
    value === 'knowledge' ||
    value === 'blog_workflow' ||
    value === 'content_management' ||
    value === 'calendar_planning' ||
    value === 'bookmark_management' ||
    value === 'thoughts_memory'
  )
}

function isPendingIntentAction(value: unknown): value is PendingIntentAction {
  return (
    value === 'blog_workflow_followup' ||
    value === 'update_post_followup' ||
    value === 'confirm_delete_post' ||
    value === 'confirm_calendar_plan' ||
    value === 'tool_followup'
  )
}

function isPendingIntentEntityType(value: unknown): value is PendingIntentEntityType {
  return (
    value === 'post' ||
    value === 'calendar_event' ||
    value === 'bookmark' ||
    value === 'thought' ||
    value === 'workflow'
  )
}

function isOperationCardScope(
  value: unknown
): value is IntentContext['lastOperationCardScope'] {
  return (
    value === 'chat' ||
    value === 'workflow' ||
    value === 'tool' ||
    value === 'delete_post' ||
    value === 'calendar_schedule' ||
    value === null
  )
}

export function normalizeIntentContext(value: Partial<IntentContext> | null | undefined): IntentContext {
  return {
    activeDomain: isIntentDomain(value?.activeDomain) ? value.activeDomain : DEFAULT_INTENT_CONTEXT.activeDomain,
    pendingAction: isPendingIntentAction(value?.pendingAction) ? value.pendingAction : null,
    pendingEntityType: isPendingIntentEntityType(value?.pendingEntityType) ? value.pendingEntityType : null,
    pendingEntityId: typeof value?.pendingEntityId === 'string' && value.pendingEntityId.trim()
      ? value.pendingEntityId.trim()
      : null,
    lastShownPostId: typeof value?.lastShownPostId === 'string' && value.lastShownPostId.trim()
      ? value.lastShownPostId.trim()
      : null,
    lastOperationCardScope: isOperationCardScope(value?.lastOperationCardScope)
      ? value.lastOperationCardScope
      : null,
    lastUserGoalSummary: typeof value?.lastUserGoalSummary === 'string' && value.lastUserGoalSummary.trim()
      ? value.lastUserGoalSummary.trim().slice(0, 240)
      : null,
    confidenceMode: value?.confidenceMode === 'cautious' ? 'cautious' : 'normal',
  }
}

export function parseIntentContext(raw: string | null | undefined): IntentContext {
  if (!raw?.trim()) {
    return { ...DEFAULT_INTENT_CONTEXT }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<IntentContext>
    return normalizeIntentContext(parsed)
  } catch {
    return { ...DEFAULT_INTENT_CONTEXT }
  }
}

export function serializeIntentContext(context: IntentContext): string {
  return JSON.stringify(normalizeIntentContext(context))
}

export function patchIntentContext(
  current: IntentContext,
  patch: Partial<IntentContext> | null | undefined
): IntentContext {
  return normalizeIntentContext({
    ...current,
    ...(patch ?? {}),
  })
}

export function summarizeIntentContext(context: IntentContext): string {
  const parts = [
    `activeDomain=${context.activeDomain}`,
    `pendingAction=${context.pendingAction ?? 'none'}`,
    `pendingEntityType=${context.pendingEntityType ?? 'none'}`,
    `pendingEntityId=${context.pendingEntityId ?? 'none'}`,
    `lastShownPostId=${context.lastShownPostId ?? 'none'}`,
    `lastOperationCardScope=${context.lastOperationCardScope ?? 'none'}`,
    `lastUserGoalSummary=${context.lastUserGoalSummary ?? 'none'}`,
    `confidenceMode=${context.confidenceMode}`,
  ]

  return parts.join(', ')
}
