import { apiClient, type ApiResponse } from './api-client'

export interface CountdownEventDto {
  id: string
  title: string
  targetDate: string
  type: 'birthday' | 'anniversary' | 'exam' | 'activity'
  createdAt: string
  updatedAt: string
}

export async function getCountdownEvents(limit?: number): Promise<CountdownEventDto[]> {
  const url = limit ? `countdown/events?limit=${limit}` : 'countdown/events'
  const res = await apiClient.get(url).json<ApiResponse<CountdownEventDto[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function createCountdownEvent(body: {
  title: string
  targetDate: string
  type: CountdownEventDto['type']
}): Promise<CountdownEventDto> {
  const res = await apiClient
    .post('countdown/events', { json: body })
    .json<ApiResponse<CountdownEventDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建失败')
  return res.data
}

export async function updateCountdownEvent(
  id: string,
  body: { title?: string; targetDate?: string; type?: CountdownEventDto['type'] }
): Promise<CountdownEventDto> {
  const res = await apiClient
    .patch(`countdown/events/${id}`, { json: body })
    .json<ApiResponse<CountdownEventDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '更新失败')
  return res.data
}

export async function deleteCountdownEvent(id: string): Promise<void> {
  const res = await apiClient.delete(`countdown/events/${id}`).json<ApiResponse<unknown>>()
  if (!res.success) throw new Error(res.error ?? '删除失败')
}
