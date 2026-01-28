'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeId =
  | 'default'
  | 'warm-natural'
  | 'classic-minimal'
  | 'vintage-study'
  | 'morandi'

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
    description: '紫蓝青渐变，科技感十足',
    previewColors: ['#9333ea', '#2563eb', '#0891b2'],
  },
  {
    id: 'warm-natural',
    name: '暖色自然风',
    description: '琥珀棕与森林绿，温暖自然',
    previewColors: ['#b45309', '#15803d', '#d97706'],
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
    description: '墨绿与奶白，复古书卷气',
    previewColors: ['#2d5a27', '#6b4423', '#d4c7b0'],
  },
  {
    id: 'morandi',
    name: '莫兰迪',
    description: '低饱和灰粉灰蓝，高级质感',
    previewColors: ['#8b7b6b', '#7a8b80', '#8b8499'],
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
