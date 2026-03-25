'use client'

import { useEffect, useState } from 'react'
import { apiClient, type ApiResponse } from '@/lib/api-client'
import type { UserPublic } from '@blog/types'

/**
 * 通过 GET /auth/me 判断当前是否已登录（cookie 会话有效）
 */
export function useAuthSession() {
  const [user, setUser] = useState<UserPublic | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('auth/me')
      .json<ApiResponse<{ user: UserPublic }>>()
      .then((res) => {
        if (cancelled) return
        const u = res.success && res.data?.user ? res.data.user : null
        setUser(u)
        setChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    user,
    isAuthenticated: Boolean(user),
    authChecked: checked,
  }
}
