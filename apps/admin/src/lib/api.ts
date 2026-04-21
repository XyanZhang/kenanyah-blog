import type {
  AdminCommentItem,
  AdminDashboardData,
  AdminMediaItem,
  AdminPostListItem,
  AdminTaxonomyItem,
  AdminUser,
  ApiResponse,
  PaginationMeta,
} from '@blog/types'

type FetchOptions = RequestInit & {
  authRetry?: boolean
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
export const SITE_BASE_URL = ((import.meta.env.VITE_SITE_BASE_URL as string | undefined) ?? 'https://www.xyan.store').replace(/\/$/, '')

async function request<T>(path: string, options: FetchOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (response.status === 401 && options.authRetry !== false) {
    const refreshed = await fetch(`${API_BASE}/admin/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (refreshed.ok) {
      return request<T>(path, { ...options, authRetry: false })
    }
  }

  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !json.success || json.data === undefined) {
    throw new Error(json.error ?? 'Request failed')
  }

  return { data: json.data, meta: json.meta }
}

export async function getAdminMe() {
  return request<{ user: AdminUser }>('/admin/auth/me')
}

export async function loginAdmin(payload: { email: string; password: string }) {
  return request<{ user: AdminUser }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logoutAdmin() {
  return request<{ message: string }>('/admin/auth/logout', {
    method: 'POST',
  })
}

export async function getDashboardData() {
  return request<AdminDashboardData>('/admin/dashboard')
}

export async function getAdminPosts(params: URLSearchParams) {
  return request<AdminPostListItem[]>(`/admin/posts?${params.toString()}`)
}

export async function updateAdminPost(id: string, payload: Record<string, unknown>) {
  return request<AdminPostListItem>(`/admin/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function getAdminComments(params: URLSearchParams) {
  return request<AdminCommentItem[]>(`/admin/comments?${params.toString()}`)
}

export async function moderateComment(id: string, approved: boolean) {
  return request<AdminCommentItem>(`/admin/comments/${id}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify({ approved }),
  })
}

export async function getAdminCategories() {
  return request<AdminTaxonomyItem[]>('/admin/categories')
}

export async function getAdminTags() {
  return request<AdminTaxonomyItem[]>('/admin/tags')
}

export async function createAdminCategory(payload: { name: string; description?: string }) {
  return request<AdminTaxonomyItem>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAdminCategory(id: string, payload: { name?: string; description?: string }) {
  return request<AdminTaxonomyItem>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminCategory(id: string) {
  return request<{ message: string }>(`/admin/categories/${id}`, {
    method: 'DELETE',
  })
}

export async function createAdminTag(payload: { name: string }) {
  return request<AdminTaxonomyItem>('/admin/tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAdminTag(id: string, payload: { name?: string }) {
  return request<AdminTaxonomyItem>(`/admin/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminTag(id: string) {
  return request<{ message: string }>(`/admin/tags/${id}`, {
    method: 'DELETE',
  })
}

export async function getAdminMedia() {
  return request<AdminMediaItem[]>('/admin/media')
}

export async function uploadAdminMedia(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<{ url: string }>('/admin/media/upload', {
    method: 'POST',
    body: form,
  })
}
