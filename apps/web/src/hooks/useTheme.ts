'use client'

import { useThemeStore, THEME_OPTIONS } from '@/store/theme-store'

export function useTheme() {
  const { themeId, setTheme } = useThemeStore()
  const currentTheme =
    THEME_OPTIONS.find((t) => t.id === themeId) ?? THEME_OPTIONS[0]

  return {
    themeId,
    currentTheme,
    setTheme,
    themes: THEME_OPTIONS,
  } as const
}
