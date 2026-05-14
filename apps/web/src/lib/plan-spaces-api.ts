import type {
  ApiResponse,
  PlanItemDto,
  PlanItemPriority,
  PlanItemStatus,
  PlanShareLinkDto,
  PlanSharePermission,
  PlanSpaceDto,
  PlanSpaceStatus,
  PlanSpaceSummaryDto,
  SharedPlanSpaceDto,
} from '@blog/types'
import { apiClient } from './api-client'

export type PlanSpacePayload = {
  title: string
  type?: string
  icon?: string
  description?: string
  status?: PlanSpaceStatus
  startDate?: string
  endDate?: string
  collaborationOn?: boolean
}

export type PlanItemPayload = {
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  status?: PlanItemStatus
  priority?: PlanItemPriority
  assignee?: string
  category?: string
  isMilestone?: boolean
  sortOrder?: number
}

export async function getPlanSpaces(params: { status?: PlanSpaceStatus } = {}) {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  const url = `plan-spaces${search.toString() ? `?${search}` : ''}`
  const res = await apiClient.get(url).json<ApiResponse<PlanSpaceSummaryDto[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function createPlanSpace(body: PlanSpacePayload) {
  const res = await apiClient.post('plan-spaces', { json: body }).json<ApiResponse<PlanSpaceDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建专项计划失败')
  return res.data
}

export async function getPlanSpace(id: string) {
  const res = await apiClient.get(`plan-spaces/${id}`).json<ApiResponse<PlanSpaceDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '获取专项计划失败')
  return res.data
}

export async function updatePlanSpace(id: string, body: Partial<PlanSpacePayload>) {
  const res = await apiClient.patch(`plan-spaces/${id}`, { json: body }).json<ApiResponse<PlanSpaceDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '更新专项计划失败')
  return res.data
}

export async function deletePlanSpace(id: string) {
  const res = await apiClient.delete(`plan-spaces/${id}`).json<ApiResponse<unknown>>()
  if (!res.success) throw new Error(res.error ?? '删除专项计划失败')
}

export async function createPlanItem(spaceId: string, body: PlanItemPayload) {
  const res = await apiClient
    .post(`plan-spaces/${spaceId}/items`, { json: body })
    .json<ApiResponse<PlanItemDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建计划项失败')
  return res.data
}

export async function updatePlanItem(spaceId: string, itemId: string, body: Partial<PlanItemPayload>) {
  const res = await apiClient
    .patch(`plan-spaces/${spaceId}/items/${itemId}`, { json: body })
    .json<ApiResponse<PlanItemDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '更新计划项失败')
  return res.data
}

export async function deletePlanItem(spaceId: string, itemId: string) {
  const res = await apiClient.delete(`plan-spaces/${spaceId}/items/${itemId}`).json<ApiResponse<unknown>>()
  if (!res.success) throw new Error(res.error ?? '删除计划项失败')
}

export async function createPlanShareLink(spaceId: string, body: {
  permission?: PlanSharePermission
  expiresAt?: string | null
}) {
  const res = await apiClient
    .post(`plan-spaces/${spaceId}/share-links`, { json: body })
    .json<ApiResponse<PlanShareLinkDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建分享链接失败')
  return res.data
}

export async function getSharedPlanSpace(token: string) {
  const res = await apiClient.get(`plan-spaces/share/${token}`).json<ApiResponse<SharedPlanSpaceDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '分享链接不可用')
  return res.data
}

export async function createSharedPlanItem(token: string, body: PlanItemPayload) {
  const res = await apiClient
    .post(`plan-spaces/share/${token}/items`, { json: body })
    .json<ApiResponse<PlanItemDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建计划项失败')
  return res.data
}

export async function updateSharedPlanItem(token: string, itemId: string, body: Partial<PlanItemPayload>) {
  const res = await apiClient
    .patch(`plan-spaces/share/${token}/items/${itemId}`, { json: body })
    .json<ApiResponse<PlanItemDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '更新计划项失败')
  return res.data
}

export async function deleteSharedPlanItem(token: string, itemId: string) {
  const res = await apiClient.delete(`plan-spaces/share/${token}/items/${itemId}`).json<ApiResponse<unknown>>()
  if (!res.success) throw new Error(res.error ?? '删除计划项失败')
}
