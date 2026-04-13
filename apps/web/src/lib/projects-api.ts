import type { ApiResponse, ProjectEntryDto } from '@blog/types'
import { apiClient } from './api-client'

export async function getProjectEntries(): Promise<ProjectEntryDto[]> {
  const res = await apiClient.get('projects').json<ApiResponse<ProjectEntryDto[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function createProjectEntry(body: {
  title: string
  description?: string
  href?: string
  category?: string
  date?: string
  status?: 'planned' | 'active' | 'completed' | 'archived'
  tags?: string[]
}): Promise<ProjectEntryDto> {
  const res = await apiClient.post('projects', { json: body }).json<ApiResponse<ProjectEntryDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建项目失败')
  return res.data
}
