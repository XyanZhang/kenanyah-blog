import { apiClient, type ApiResponse } from './api-client'

/** 获取有发布文章的日期列表（YYYY-MM-DD），供日历「有文章」圆点使用，公开接口 */
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

export interface CalendarAnnotationDto {
  id: string
  date: string
  label: string
  createdAt: string
  updatedAt: string
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
