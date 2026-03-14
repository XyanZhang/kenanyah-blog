import ky from 'ky'

/**
 * Get the API base URL for the current environment.
 * In production with nginx, API is served at /api on the same domain.
 * In development, use full URL from env or default, and ensure it includes /api.
 */
export function getApiBaseUrl(): string {
  const rawEnvUrl = process.env.NEXT_PUBLIC_API_URL

  // 统一规范化：如果配置里没带 /api，则自动补上
  const normalizeWithApiPath = (url: string): string => {
    const trimmed = url.replace(/\/+$/, '')
    if (trimmed.endsWith('/api')) return trimmed
    return `${trimmed}/api`
  }

  // 若配置了完整 API 地址（如 Docker 测试环境 3011），优先使用，否则 production 时用同源 /api
  if (rawEnvUrl && rawEnvUrl.startsWith('http')) {
    return normalizeWithApiPath(rawEnvUrl)
  }

  if (typeof window !== 'undefined') {
    // Browser: use /api prefix in production (nginx routes /api to backend)
    if (process.env.NODE_ENV === 'production') {
      return '/api'
    }
  }

  if (rawEnvUrl) {
    return normalizeWithApiPath(rawEnvUrl)
  }
  return 'http://localhost:3001/api'
}

const API_BASE_URL = getApiBaseUrl()

// 401 自动刷新：仅浏览器端，用于携带 cookie 调用 /auth/refresh 后重试
const isBrowser = typeof window !== 'undefined'
const retriedRequests = new WeakSet<Request>()
const requestClones = new WeakMap<Request, Request>()

async function refreshAccessToken(): Promise<boolean> {
  const base = getApiBaseUrl()
  const url = base.startsWith('http')
    ? `${base.replace(/\/$/, '')}/auth/refresh`
    : `${window.location.origin}${base}/auth/refresh`
  const res = await fetch(url, { method: 'POST', credentials: 'include' })
  return res.ok
}

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  hooks: {
    beforeRequest: isBrowser
      ? [
          (request) => {
            try {
              requestClones.set(request, request.clone())
            } catch {
              // clone 可能失败（如 body 已读），忽略
            }
          },
        ]
      : [],
    afterResponse: isBrowser
      ? [
          async (request, _options, response) => {
            if (response.status !== 401) return response
            const clone = requestClones.get(request)
            if (!clone || retriedRequests.has(request)) return response
            retriedRequests.add(request)
            const ok = await refreshAccessToken()
            if (!ok) return response
            return ky(clone, { credentials: 'include' })
          },
        ]
      : [],
    beforeError: [
      async (error) => {
        const { response } = error
        if (response) {
          try {
            const body = await response.json()
            error.message = (body as { error?: string }).error || error.message
          } catch {
            // Response is not JSON
          }
        }
        return error
      },
    ],
  },
})

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
