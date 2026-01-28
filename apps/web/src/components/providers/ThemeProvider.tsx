'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/theme-store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((state) => state.themeId)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId)
  }, [themeId])

  return <>{children}</>
}
