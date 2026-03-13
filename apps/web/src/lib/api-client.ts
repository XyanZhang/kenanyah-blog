import ky from 'ky'

/**
 * Get the API base URL for the current environment.
 * In production with nginx, API is served at /api on the same domain.
 * In development, use full URL from env or default.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser: use relative path in production, full URL in development
    if (process.env.NODE_ENV === 'production') {
      return '' // Relative path - nginx handles routing
    }
  }
  // Server-side or development: use full URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

const API_BASE_URL = getApiBaseUrl()

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  hooks: {
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
