'use client'

import { useEffect } from 'react'
import { useThemeStore, resolveColorMode } from '@/store/theme-store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((state) => state.themeId)
  const colorModePreference = useThemeStore((state) => state.colorModePreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const resolvedColorMode = resolveColorMode(colorModePreference, mediaQuery.matches)
      const root = document.documentElement

      root.setAttribute('data-theme', themeId)
      root.setAttribute('data-color-mode-preference', colorModePreference)
      root.setAttribute('data-color-mode', resolvedColorMode)
      root.style.colorScheme = resolvedColorMode
    }

    applyTheme()

    if (colorModePreference !== 'system') return

    mediaQuery.addEventListener('change', applyTheme)

    return () => {
      mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [themeId, colorModePreference])

  return <>{children}</>
}
