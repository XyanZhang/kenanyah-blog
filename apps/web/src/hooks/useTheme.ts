'use client'

import { useEffect, useState } from 'react'
import {
  useThemeStore,
  THEME_OPTIONS,
  COLOR_MODE_OPTIONS,
  resolveColorMode,
} from '@/store/theme-store'

export function useTheme() {
  const {
    themeId,
    colorModePreference,
    customTheme,
    setTheme,
    setColorModePreference,
    updateCustomTheme,
    getThemeConfig,
  } = useThemeStore()
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystemPrefersDark(mediaQuery.matches)

    sync()
    mediaQuery.addEventListener('change', sync)

    return () => {
      mediaQuery.removeEventListener('change', sync)
    }
  }, [])

  const themes = THEME_OPTIONS.map((theme) =>
    theme.id === 'custom'
      ? {
          ...theme,
          name: customTheme.name || theme.name,
          previewColors: [customTheme.primary, customTheme.secondary, customTheme.tertiary] as const,
        }
      : theme
  )
  const currentTheme = themes.find((t) => t.id === themeId) ?? themes[0]
  const resolvedColorMode = resolveColorMode(colorModePreference, systemPrefersDark)

  return {
    themeId,
    currentTheme,
    setTheme,
    themes,
    colorModePreference,
    colorModes: COLOR_MODE_OPTIONS,
    resolvedColorMode,
    setColorModePreference,
    customTheme,
    updateCustomTheme,
    getThemeConfig,
  } as const
}
