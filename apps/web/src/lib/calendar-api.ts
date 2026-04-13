import type {
  ApiResponse,
  CalendarAnnotationSummary,
  CalendarDayResponse,
  CalendarDaySummaryDto,
  CalendarEventDto,
  CalendarEventSourceType,
  CalendarEventStatus,
  CalendarQuickCreateResult,
} from '@blog/types'
import { apiClient } from './api-client'

export type CalendarAnnotationDto = CalendarAnnotationSummary

export async function getPublishedPostDates(params: {
  from?: string
  to?: string
}): Promise<string[]> {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const url = `posts/published-dates${search.toString() ? `?${search}` : ''}`
  const res = await apiClient.get(url).json<ApiResponse<string[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function getCalendarAnnotations(params: {
  from?: string
  to?: string
}): Promise<CalendarAnnotationDto[]> {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const url = `calendar/annotations${search.toString() ? `?${search}` : ''}`
  const res = await apiClient.get(url).json<ApiResponse<CalendarAnnotationDto[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function saveCalendarAnnotation(body: {
  date: string
  label: string
}): Promise<CalendarAnnotationDto> {
  const res = await apiClient
    .post('calendar/annotations', { json: body })
    .json<ApiResponse<CalendarAnnotationDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '保存失败')
  return res.data
}

export async function updateCalendarAnnotation(
  id: string,
  body: { label: string }
): Promise<CalendarAnnotationDto> {
  const res = await apiClient
    .patch(`calendar/annotations/${id}`, { json: body })
    .json<ApiResponse<CalendarAnnotationDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '更新失败')
  return res.data
}

export async function deleteCalendarAnnotation(id: string): Promise<void> {
  const res = await apiClient.delete(`calendar/annotations/${id}`).json<ApiResponse<unknown>>()
  if (!res.success) throw new Error(res.error ?? '删除失败')
}

export async function getCalendarEventSummary(params: {
  from?: string
  to?: string
}): Promise<CalendarDaySummaryDto[]> {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const url = `calendar/events/summary${search.toString() ? `?${search}` : ''}`
  const res = await apiClient.get(url).json<ApiResponse<CalendarDaySummaryDto[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function getCalendarEvents(params: {
  from?: string
  to?: string
}): Promise<CalendarEventDto[]> {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const url = `calendar/events${search.toString() ? `?${search}` : ''}`
  const res = await apiClient.get(url).json<ApiResponse<CalendarEventDto[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function getCalendarDay(date: string): Promise<CalendarDayResponse> {
  const res = await apiClient.get(`calendar/day/${date}`).json<ApiResponse<CalendarDayResponse>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '获取当天事件失败')
  return res.data
}

export async function createCalendarEvent(body: {
  title: string
  description?: string
  date: string
  status?: CalendarEventStatus
  allDay?: boolean
  sourceType?: CalendarEventSourceType
}): Promise<CalendarEventDto> {
  const res = await apiClient
    .post('calendar/events', { json: body })
    .json<ApiResponse<CalendarEventDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建事件失败')
  return res.data
}

export async function updateCalendarEvent(
  id: string,
  body: {
    title?: string
    description?: string | null
    date?: string
    status?: CalendarEventStatus
    allDay?: boolean
  }
): Promise<CalendarEventDto> {
  const res = await apiClient
    .patch(`calendar/events/${id}`, { json: body })
    .json<ApiResponse<CalendarEventDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '更新事件失败')
  return res.data
}

export async function quickCreateCalendarEvent(body: {
  rawText: string
  defaultDate?: string
  sourceInputType?: 'text' | 'voice'
}): Promise<CalendarQuickCreateResult> {
  const res = await apiClient
    .post('calendar/events/quick-create', { json: body })
    .json<ApiResponse<CalendarQuickCreateResult>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '快速创建失败')
  return res.data
}
