'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeId =
  | 'default'
  | 'warm-natural'
  | 'classic-minimal'
  | 'vintage-study'
  | 'morandi'
  | 'sakura-pink'

export interface ThemeOption {
  readonly id: ThemeId
  readonly name: string
  readonly description: string
  readonly previewColors: readonly [string, string, string]
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: 'default',
    name: '科技渐变',
    description: '紫蓝青渐变，柔和低饱和',
    previewColors: ['#7c6b9e', '#5a7a9e', '#5a8a8f'],
  },
  {
    id: 'warm-natural',
    name: '暖色自然风',
    description: '琥珀棕与森林绿，柔和低饱和',
    previewColors: ['#9a7a4a', '#5a7a5a', '#a88a5a'],
  },
  {
    id: 'classic-minimal',
    name: '经典极简',
    description: '纯黑白灰，杂志风格',
    previewColors: ['#171717', '#737373', '#e5e5e5'],
  },
  {
    id: 'vintage-study',
    name: '复古书房',
    description: '墨绿与奶白，柔和低饱和',
    previewColors: ['#4a6a45', '#6a5a45', '#d0c6b0'],
  },
  {
    id: 'morandi',
    name: '莫兰迪',
    description: '低饱和灰粉灰蓝，高级质感',
    previewColors: ['#8b7b6b', '#7a8b80', '#8b8499'],
  },
  {
    id: 'sakura-pink',
    name: '樱花粉',
    description: '浅粉色系，温柔甜美',
    previewColors: ['#fce7f3', '#f9a8d4', '#f472b6'],
  },
] as const

interface ThemeState {
  readonly themeId: ThemeId
  readonly setTheme: (themeId: ThemeId) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'default' as ThemeId,
      setTheme: (themeId: ThemeId) => {
        set({ themeId })
      },
    }),
    {
      name: 'blog-theme',
      version: 1,
    }
  )
)
