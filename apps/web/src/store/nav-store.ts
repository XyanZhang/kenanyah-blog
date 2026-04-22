'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getDefaultNavItemsConfig,
  mergeNavItemsWithDefaults,
  type NavItemConfig,
} from '@/components/navigation/nav-items'

export interface NavConfig {
  homePosition: { x: number; y: number }
  customSize: { width: number; height: number } | null
  items: NavItemConfig[]
  innerPageMode: 'rail'
}

type LegacyNavConfig = Partial<NavConfig> & {
  visibleItems?: string[]
  horizontalPosition?: { x: number; y: number }
  verticalPosition?: { x: number; y: number }
  position?: { x: number; y: number }
  layout?: string
}

interface NavState {
  config: NavConfig
  isResizing: boolean
  hasHydrated: boolean
  updatePosition: (delta: { x: number; y: number }) => void
  setPosition: (position: { x: number; y: number }) => void
  updateSize: (size: { width: number; height: number } | null) => void
  setConfigFromApi: (config: LegacyNavConfig) => void
  updateNavItem: (
    id: string,
    patch: Partial<Pick<NavItemConfig, 'label' | 'href' | 'visible' | 'sortOrder'>>
  ) => void
  setNavItems: (items: NavItemConfig[]) => void
  toggleItemVisibility: (itemId: string) => void
  setResizing: (isResizing: boolean) => void
  resetConfig: () => void
}

const DEFAULT_CONFIG: NavConfig = {
  homePosition: { x: 0, y: 0 },
  customSize: null,
  items: getDefaultNavItemsConfig(),
  innerPageMode: 'rail',
}

function resolveHomePosition(config?: LegacyNavConfig): { x: number; y: number } {
  return (
    config?.homePosition ??
    config?.verticalPosition ??
    config?.horizontalPosition ??
    config?.position ??
    DEFAULT_CONFIG.homePosition
  )
}

function normalizeConfig(config?: LegacyNavConfig): NavConfig {
  const items = config?.items?.length
    ? mergeNavItemsWithDefaults(config.items)
    : getDefaultNavItemsConfig()

  return {
    ...DEFAULT_CONFIG,
    ...config,
    homePosition: resolveHomePosition(config),
    items,
    innerPageMode: 'rail',
  }
}

export const useNavStore = create<NavState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      isResizing: false,
      hasHydrated: false,

      updatePosition: (delta) => {
        const { config } = get()
        const current = config.homePosition
        set({
          config: {
            ...config,
            homePosition: {
              x: current.x + delta.x,
              y: current.y + delta.y,
            },
          },
        })
      },

      setPosition: (position) => {
        const { config } = get()
        set({
          config: {
            ...config,
            homePosition: position,
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

      setConfigFromApi: (config) => {
        set((state) => {
          const merged = normalizeConfig({ ...state.config, ...config })

          if (config.items?.length) {
            merged.items = mergeNavItemsWithDefaults(config.items)
          } else if (
            config.visibleItems?.length &&
            (!state.config.items?.length || state.config.items.every((item) => item.visible === undefined))
          ) {
            const defaultItems = getDefaultNavItemsConfig()
            merged.items = defaultItems.map((item) => ({
              ...item,
              visible: config.visibleItems!.includes(item.id),
            }))
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
            items: state.config.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
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
        if (items.filter((item) => item.visible).length === 0) return
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
      version: 5,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { config?: LegacyNavConfig }
        const current = currentState as NavState
        if (!persisted?.config) return current

        let items = persisted.config.items
        if (!items?.length && persisted.config.visibleItems?.length) {
          items = getDefaultNavItemsConfig().map((item) => ({
            ...item,
            visible: persisted.config!.visibleItems!.includes(item.id),
          }))
        }

        return {
          ...current,
          ...persisted,
          hasHydrated: true,
          config: {
            ...normalizeConfig(persisted.config),
            items: mergeNavItemsWithDefaults(items),
          },
        }
      },
      onRehydrateStorage: () => () => {
        useNavStore.setState({ hasHydrated: true })
      },
      migrate: (persistedState: unknown, version: number) => {
        const old = persistedState as { config?: LegacyNavConfig }

        if (version < 2) {
          const pos = old?.config?.position ?? { x: 0, y: 0 }
          return {
            ...old,
            config: {
              ...(old?.config ?? {}),
              homePosition: pos,
              innerPageMode: 'rail',
            },
          }
        }

        if (version < 4 && old?.config && !('items' in old.config) && old.config.visibleItems) {
          const defaultItems = getDefaultNavItemsConfig()
          return {
            ...old,
            config: {
              ...old.config,
              homePosition: resolveHomePosition(old.config),
              innerPageMode: 'rail',
              items: defaultItems.map((item) => ({
                ...item,
                visible: old.config!.visibleItems!.includes(item.id),
              })),
            },
          }
        }

        if (old?.config && Array.isArray(old.config.items)) {
          return {
            ...old,
            config: {
              ...old.config,
              homePosition: resolveHomePosition(old.config),
              innerPageMode: 'rail',
              items: mergeNavItemsWithDefaults(old.config.items),
            },
          }
        }

        return {
          ...old,
          config: {
            ...(old?.config ?? {}),
            homePosition: resolveHomePosition(old?.config),
            innerPageMode: 'rail',
          },
        }
      },
      partialize: (state) => ({
        config: {
          homePosition: state.config.homePosition,
          customSize: state.config.customSize,
          items: state.config.items,
          innerPageMode: state.config.innerPageMode,
        },
      }),
    }
  )
)
