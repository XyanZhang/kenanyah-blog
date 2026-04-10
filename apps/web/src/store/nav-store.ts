'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getDefaultNavItemsConfig,
  mergeNavItemsWithDefaults,
  type NavItemConfig,
} from '@/components/navigation/nav-items'

export interface NavConfig {
  horizontalPosition: { x: number; y: number }
  verticalPosition: { x: number; y: number }
  customSize: { width: number; height: number } | null
  /** 导航项列表（含 label、href、可见性），从数据库同步 */
  items: NavItemConfig[]
}

interface NavState {
  config: NavConfig
  isResizing: boolean

  updatePosition: (delta: { x: number; y: number }, isHorizontal: boolean) => void
  setPosition: (position: { x: number; y: number }, isHorizontal: boolean) => void
  updateSize: (size: { width: number; height: number } | null) => void
  /** 从服务端/API 恢复完整配置（用于同步云端配置到本地）；兼容旧版 visibleItems */
  setConfigFromApi: (config: Partial<NavConfig> & { visibleItems?: string[] }) => void
  /** 更新单个导航项 */
  updateNavItem: (id: string, patch: Partial<Pick<NavItemConfig, 'label' | 'href' | 'visible' | 'sortOrder'>>) => void
  /** 设置完整导航项列表 */
  setNavItems: (items: NavItemConfig[]) => void
  toggleItemVisibility: (itemId: string) => void
  setResizing: (isResizing: boolean) => void
  resetConfig: () => void
}

const DEFAULT_CONFIG: NavConfig = {
  horizontalPosition: { x: 0, y: 0 },
  verticalPosition: { x: 0, y: 0 },
  customSize: null,
  items: getDefaultNavItemsConfig(),
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

      setConfigFromApi: (config: Partial<NavConfig> & { visibleItems?: string[] }) => {
        set((state) => {
          const merged = { ...DEFAULT_CONFIG, ...state.config, ...config } as NavConfig
          if (config.items?.length) {
            merged.items = mergeNavItemsWithDefaults(config.items)
          } else if (config.visibleItems?.length && (!state.config.items?.length || state.config.items.every((i) => i.visible === undefined))) {
            const defaultItems = getDefaultNavItemsConfig()
            merged.items = defaultItems.map((item) => ({
              ...item,
              visible: config.visibleItems!.includes(item.id),
            }))
          } else if (!merged.items?.length) {
            merged.items = getDefaultNavItemsConfig()
          } else {
            merged.items = mergeNavItemsWithDefaults(merged.items)
          }
          return { config: merged }
        })
      },

      updateNavItem: (id, patch) => {
        set((state) => ({
          config: {
            ...state.config,
            items: state.config.items.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            ),
          },
        }))
      },

      setNavItems: (items) => {
        set((state) => ({
          config: { ...state.config, items },
        }))
      },

      toggleItemVisibility: (itemId) => {
        const { config } = get()
        const items = config.items.map((item) =>
          item.id === itemId ? { ...item, visible: !item.visible } : item
        )
        if (items.filter((i) => i.visible).length === 0) return
        set({ config: { ...config, items } })
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
      version: 4,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { config?: NavConfig & { layout?: string; visibleItems?: string[] } }
        const current = currentState as NavState
        if (!persisted?.config) return current
        let items = persisted.config.items
        if (!items?.length && persisted.config.visibleItems?.length) {
          items = getDefaultNavItemsConfig().map((item) => ({
            ...item,
            visible: persisted.config!.visibleItems!.includes(item.id),
          }))
        }
        items = mergeNavItemsWithDefaults(items)
        return {
          ...current,
          ...persisted,
          config: {
            ...DEFAULT_CONFIG,
            ...persisted.config,
            items,
          },
        }
      },
      migrate: (persistedState: unknown, version: number) => {
        const old = persistedState as { config?: { position?: { x: number; y: number }; visibleItems?: string[]; layout?: string } }
        if (version < 2) {
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
        if (version < 4 && old?.config && !('items' in old.config) && old.config.visibleItems) {
          const defaultItems = getDefaultNavItemsConfig()
          return {
            ...old,
            config: {
              ...old.config,
              items: defaultItems.map((item) => ({
                ...item,
                visible: old.config!.visibleItems!.includes(item.id),
              })),
            },
          }
        }
        if (old?.config && 'items' in old.config && Array.isArray(old.config.items)) {
          return {
            ...old,
            config: {
              ...old.config,
              items: mergeNavItemsWithDefaults(old.config.items),
            },
          }
        }
        return persistedState
      },
      partialize: (state) => ({
        config: {
          horizontalPosition: state.config.horizontalPosition,
          verticalPosition: state.config.verticalPosition,
          customSize: state.config.customSize,
          items: state.config.items,
        },
      }),
    }
  )
)
