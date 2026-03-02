import ky from 'ky'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
