import type { PlanItemPriority, PlanItemStatus, PlanSpaceStatus } from '@blog/types'

export const PLAN_STATUS_LABELS: Record<PlanItemStatus, string> = {
  planned: '计划中',
  in_progress: '推进中',
  done: '已完成',
  blocked: '受阻',
  canceled: '已取消',
}

export const PLAN_SPACE_STATUS_LABELS: Record<PlanSpaceStatus, string> = {
  active: '进行中',
  completed: '已完成',
  archived: '已归档',
}

export const PLAN_PRIORITY_LABELS: Record<PlanItemPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

export const PLAN_STATUS_ORDER: PlanItemStatus[] = ['planned', 'in_progress', 'blocked', 'done', 'canceled']
export const PLAN_PRIORITY_ORDER: PlanItemPriority[] = ['low', 'medium', 'high', 'urgent']
