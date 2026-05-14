export type PlanSpaceStatus = 'active' | 'archived' | 'completed'
export type PlanItemStatus = 'planned' | 'in_progress' | 'done' | 'blocked' | 'canceled'
export type PlanItemPriority = 'low' | 'medium' | 'high' | 'urgent'
export type PlanSharePermission = 'read' | 'edit'

export interface PlanItemDto {
  id: string
  spaceId: string
  title: string
  description: string | null
  date: string
  startTime: string | null
  endTime: string | null
  allDay: boolean
  status: PlanItemStatus
  priority: PlanItemPriority
  assignee: string | null
  category: string | null
  isMilestone: boolean
  syncedEventId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PlanSpaceSummaryDto {
  id: string
  title: string
  type: string
  icon: string
  description: string | null
  status: PlanSpaceStatus
  startDate: string | null
  endDate: string | null
  collaborationOn: boolean
  shareToken: string
  itemCount: number
  doneCount: number
  milestoneCount: number
  nextItem: PlanItemDto | null
  createdAt: string
  updatedAt: string
}

export interface PlanSpaceDto extends PlanSpaceSummaryDto {
  items: PlanItemDto[]
  shareLinks: PlanShareLinkDto[]
}

export interface PlanShareLinkDto {
  id: string
  spaceId: string
  token: string
  permission: PlanSharePermission
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SharedPlanSpaceDto {
  space: PlanSpaceDto
  permission: PlanSharePermission
}
