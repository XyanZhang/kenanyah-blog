'use client'

import { useEffect, useState } from 'react'
import { apiClient, type ApiResponse } from '@/lib/api-client'
import type { UserPublic } from '@blog/types'

/**
 * 通过 GET /auth/me 判断当前是否已登录（cookie 会话有效）
 */
export function useAuthSession() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('auth/me')
      .json<ApiResponse<{ user: UserPublic }>>()
      .then((res) => {
        if (cancelled) return
        setIsAuthenticated(Boolean(res.success && res.data?.user))
        setChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setIsAuthenticated(false)
        setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { isAuthenticated, authChecked: checked }
}
