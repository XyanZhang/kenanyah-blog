'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { navItems } from '@/components/navigation/nav-items'

export type NavLayout = 'auto' | 'horizontal' | 'vertical'

export interface NavConfig {
  // Separate position offsets for horizontal and vertical layouts
  horizontalPosition: { x: number; y: number }
  verticalPosition: { x: number; y: number }
  layout: NavLayout
  customSize: { width: number; height: number } | null
  visibleItems: string[]
}

interface NavState {
  config: NavConfig
  isResizing: boolean

  updatePosition: (delta: { x: number; y: number }, isHorizontal: boolean) => void
  setPosition: (position: { x: number; y: number }, isHorizontal: boolean) => void
  updateSize: (size: { width: number; height: number } | null) => void
  setLayout: (layout: NavLayout) => void
  toggleItemVisibility: (itemId: string) => void
  setResizing: (isResizing: boolean) => void
  resetConfig: () => void
}

const DEFAULT_CONFIG: NavConfig = {
  horizontalPosition: { x: 0, y: 0 },
  verticalPosition: { x: 0, y: 0 },
  layout: 'auto',
  customSize: null,
  visibleItems: navItems.map((item) => item.id),
}

export const useNavStore = create<NavState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      isResizing: false,

      updatePosition: (delta, isHorizontal) => {
        const { config } = get()
        const key = isHorizontal ? 'horizontalPosition' : 'verticalPosition'
        const current = config[key]
        set({
          config: {
            ...config,
            [key]: {
              x: current.x + delta.x,
              y: current.y + delta.y,
            },
          },
        })
      },

      setPosition: (position, isHorizontal) => {
        const { config } = get()
        const key = isHorizontal ? 'horizontalPosition' : 'verticalPosition'
        set({
          config: {
            ...config,
            [key]: position,
          },
        })
      },

      updateSize: (size) => {
        const { config } = get()
        set({
          config: {
            ...config,
            customSize: size,
          },
        })
      },

      setLayout: (layout) => {
        const { config } = get()
        set({
          config: {
            ...config,
            layout,
          },
        })
      },

      toggleItemVisibility: (itemId) => {
        const { config } = get()
        const isVisible = config.visibleItems.includes(itemId)
        const newVisibleItems = isVisible
          ? config.visibleItems.filter((id) => id !== itemId)
          : [...config.visibleItems, itemId]

        if (newVisibleItems.length === 0) {
          return
        }

        set({
          config: {
            ...config,
            visibleItems: newVisibleItems,
          },
        })
      },

      setResizing: (isResizing) => {
        set({ isResizing })
      },

      resetConfig: () => {
        set({ config: DEFAULT_CONFIG })
      },
    }),
    {
      name: 'nav-config',
      version: 2,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { config?: NavConfig }
        const current = currentState as NavState
        return {
          ...current,
          ...persisted,
          config: persisted?.config
            ? { ...persisted.config, visibleItems: DEFAULT_CONFIG.visibleItems }
            : current.config,
        }
      },
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          const old = persistedState as { config?: { position?: { x: number; y: number } } }
          const pos = old?.config?.position ?? { x: 0, y: 0 }
          return {
            ...old,
            config: {
              ...(old?.config ?? {}),
              horizontalPosition: pos,
              verticalPosition: pos,
            },
          }
        }
        return persistedState
      },
      // 只持久化位置、尺寸、布局，不持久化 visibleItems，每次加载都用默认「全部显示」
      partialize: (state) => ({
        config: {
          horizontalPosition: state.config.horizontalPosition,
          verticalPosition: state.config.verticalPosition,
          layout: state.config.layout,
          customSize: state.config.customSize,
        },
      }),
    }
  )
)
