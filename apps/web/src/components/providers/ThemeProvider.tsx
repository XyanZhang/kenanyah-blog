'use client'

import { useEffect } from 'react'
import { useThemeStore, resolveColorMode } from '@/store/theme-store'
import { buildCustomThemeCssVariables } from '@/lib/theme/custom-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((state) => state.themeId)
  const colorModePreference = useThemeStore((state) => state.colorModePreference)
  const customTheme = useThemeStore((state) => state.customTheme)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const resolvedColorMode = resolveColorMode(colorModePreference, mediaQuery.matches)
      const root = document.documentElement

      root.setAttribute('data-theme', themeId)
      root.setAttribute('data-color-mode-preference', colorModePreference)
      root.setAttribute('data-color-mode', resolvedColorMode)
      root.style.colorScheme = resolvedColorMode

      if (themeId === 'custom') {
        const variables = buildCustomThemeCssVariables(customTheme)
        Object.entries(variables).forEach(([key, value]) => {
          root.style.setProperty(key, value)
        })
      } else {
        Object.keys(buildCustomThemeCssVariables(customTheme)).forEach((key) => {
          root.style.removeProperty(key)
        })
      }
    }

    applyTheme()

    if (colorModePreference !== 'system') return

    mediaQuery.addEventListener('change', applyTheme)

    return () => {
      mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [customTheme, themeId, colorModePreference])

  return <>{children}</>
}
