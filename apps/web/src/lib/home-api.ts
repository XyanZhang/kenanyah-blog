import { apiClient, type ApiResponse } from './api-client'
import type { DashboardLayout } from '@blog/types'
import type { ThemeConfig } from '@blog/types'
import type { NavConfig } from '@/store/nav-store'

export interface HomeConfigData {
  layout: DashboardLayout
  nav: NavConfig
  canvas: { scale?: number } | null
  theme: ThemeConfig | null
}

export interface HomeTemplateSummary {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface HomeTemplateDetail extends HomeTemplateSummary {
  layout: DashboardLayout
  nav: NavConfig | null
  canvas: { scale?: number } | null
}

/** 静态配置路径：数据库不可用时的备用配置 */
const STATIC_CONFIG_URL = '/home-config.json'

/** GET /home/config，数据库不可用时回退到静态 JSON */
export async function getHomeConfig(): Promise<HomeConfigData | null> {
  try {
    const res = await apiClient.get('home/config').json<ApiResponse<HomeConfigData | null>>()
    if (!res.success) throw new Error(res.error ?? '获取首页配置失败')
    return res.data
      ? {
          ...res.data,
          theme: res.data.theme ?? null,
        }
      : null
  } catch {
    // 数据库/后端不可用，尝试从静态 JSON 加载
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const resp = await fetch(`${base}${STATIC_CONFIG_URL}`)
      if (!resp.ok) return null
      const data = (await resp.json()) as HomeConfigData | null
      if (!data || !data.layout || !data.nav) return null
      return {
        ...data,
        theme: data.theme ?? null,
      }
    } catch {
      return null
    }
  }
}

/** PUT /home/config */
export async function putHomeConfig(payload: {
  layout: DashboardLayout
  nav: NavConfig
  canvas?: { scale?: number } | null
  theme?: ThemeConfig | null
}): Promise<void> {
  const res = await apiClient
    .put('home/config', { json: payload })
    .json<ApiResponse<unknown>>()
  if (!res.success) throw new Error(res.error ?? '同步配置失败')
}

/** GET /home/templates */
export async function getHomeTemplates(): Promise<HomeTemplateSummary[]> {
  const res = await apiClient
    .get('home/templates')
    .json<ApiResponse<HomeTemplateSummary[]>>()
  if (!res.success) throw new Error(res.error ?? '获取模板列表失败')
  return res.data ?? []
}

/** GET /home/templates/:id */
export async function getHomeTemplate(id: string): Promise<HomeTemplateDetail> {
  const res = await apiClient
    .get(`home/templates/${id}`)
    .json<ApiResponse<HomeTemplateDetail>>()
  if (!res.success) throw new Error(res.error ?? '获取模板失败')
  if (!res.data) throw new Error('模板不存在')
  return res.data
}

/** POST /home/templates（含 layout + nav 定位与尺寸） */
export async function createHomeTemplate(payload: {
  name: string
  description?: string | null
  layout: DashboardLayout
  nav: NavConfig
  canvas?: { scale?: number } | null
}): Promise<HomeTemplateSummary> {
  const res = await apiClient
    .post('home/templates', { json: payload })
    .json<ApiResponse<HomeTemplateSummary>>()
  if (!res.success) throw new Error(res.error ?? '保存模板失败')
  if (!res.data) throw new Error('保存失败')
  return res.data
}

/** DELETE /home/templates/:id */
export async function deleteHomeTemplate(id: string): Promise<void> {
  const res = await apiClient
    .delete(`home/templates/${id}`)
    .json<ApiResponse<unknown>>()
  if (!res.success) throw new Error(res.error ?? '删除模板失败')
}
