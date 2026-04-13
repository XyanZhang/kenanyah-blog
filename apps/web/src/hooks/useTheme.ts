'use client'

import { useEffect, useState } from 'react'
import {
  useThemeStore,
  THEME_OPTIONS,
  COLOR_MODE_OPTIONS,
  resolveColorMode,
} from '@/store/theme-store'

export function useTheme() {
  const { themeId, colorModePreference, setTheme, setColorModePreference } = useThemeStore()
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

  const currentTheme =
    THEME_OPTIONS.find((t) => t.id === themeId) ?? THEME_OPTIONS[0]
  const resolvedColorMode = resolveColorMode(colorModePreference, systemPrefersDark)

  return {
    themeId,
    currentTheme,
    setTheme,
    themes: THEME_OPTIONS,
    colorModePreference,
    colorModes: COLOR_MODE_OPTIONS,
    resolvedColorMode,
    setColorModePreference,
  } as const
}
