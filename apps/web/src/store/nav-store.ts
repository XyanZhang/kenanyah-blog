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
  /** 从服务端/API 恢复完整配置（用于同步云端配置到本地） */
  setConfigFromApi: (config: Partial<NavConfig>) => void
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

      setConfigFromApi: (config) => {
        set((state) => ({
          config: {
            ...DEFAULT_CONFIG,
            ...state.config,
            ...config,
            visibleItems: config.visibleItems?.length
              ? config.visibleItems
              : state.config.visibleItems?.length
                ? state.config.visibleItems
                : DEFAULT_CONFIG.visibleItems,
          },
        }))
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
      version: 3,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { config?: NavConfig }
        const current = currentState as NavState
        return {
          ...current,
          ...persisted,
          config: persisted?.config
            ? {
                ...DEFAULT_CONFIG,
                ...persisted.config,
                // 如果持久化的 visibleItems 为空或不存在，使用默认值
                visibleItems: persisted.config.visibleItems?.length
                  ? persisted.config.visibleItems
                  : DEFAULT_CONFIG.visibleItems,
              }
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
      // 持久化 visibleItems，支持用户自定义导航项显示/隐藏
      partialize: (state) => ({
        config: {
          horizontalPosition: state.config.horizontalPosition,
          verticalPosition: state.config.verticalPosition,
          layout: state.config.layout,
          customSize: state.config.customSize,
          visibleItems: state.config.visibleItems,
        },
      }),
    }
  )
)
