'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardCard, DashboardLayout, CardDimensions } from '@blog/types'
import { CardType, CardSize } from '@blog/types'
import { createDefaultLayout, createDefaultCard } from '@/lib/dashboard/default-layout'
import { generateCircularLayout } from '@/lib/dashboard/layout-algorithms'
import { applyTemplate, LayoutTemplate } from '@/lib/dashboard/layout-templates'
import {
  DEFAULT_LAYOUT_CONFIG,
  STORAGE_KEY,
  LAYOUT_VERSION,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '@/lib/constants/dashboard'

interface DashboardState {
  // State
  layout: DashboardLayout | null
  isEditMode: boolean
  isLoading: boolean
  selectedCardId: string | null

  // Actions
  initializeLayout: () => void
  addCard: (type: CardType, size: CardSize) => void
  removeCard: (cardId: string) => void
  updateCard: (cardId: string, updates: Partial<DashboardCard>) => void
  updateCardPosition: (cardId: string, delta: { x: number; y: number }) => void
  updateCardSize: (cardId: string, dimensions: CardDimensions, positionDelta?: { x: number; y: number }) => void
  toggleEditMode: () => void
  selectCard: (cardId: string | null) => void
  resetLayout: () => void
  reorderCards: () => void
  applyLayoutTemplate: (template: LayoutTemplate) => void
  /** 直接设置 layout（用于从云端加载或应用用户保存的模板） */
  setLayout: (layout: DashboardLayout | null) => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Initial state
      layout: null,
      isEditMode: false,
      isLoading: true,
      selectedCardId: null,

      // Initialize layout (load from storage or create default)
      initializeLayout: () => {
        const { layout } = get()
        if (!layout) {
          set({ layout: createDefaultLayout(), isLoading: false })
        } else {
          set({ isLoading: false })
        }
      },

      // Add a new card
      addCard: (type: CardType, size: CardSize) => {
        const { layout } = get()
        if (!layout) return

        const newCardBase = createDefaultCard(type, size)
        const existingCards = layout.cards

        // Calculate position for new card (circular layout is center-relative → add canvas center offset)
        const allCards = [...existingCards, newCardBase as DashboardCard]
        const positions = generateCircularLayout(allCards, DEFAULT_LAYOUT_CONFIG)
        const centerPos = positions[positions.length - 1]
        const newPosition = {
          ...centerPos,
          x: centerPos.x + CANVAS_WIDTH / 2,
          y: centerPos.y + CANVAS_HEIGHT / 2,
        }

        const newCard: DashboardCard = {
          ...newCardBase,
          position: newPosition,
        }

        set({
          layout: {
            ...layout,
            cards: [...layout.cards, newCard],
            updatedAt: new Date(),
          },
        })
      },

      // Remove a card
      removeCard: (cardId: string) => {
        const { layout, selectedCardId } = get()
        if (!layout) return

        set({
          layout: {
            ...layout,
            cards: layout.cards.filter((card) => card.id !== cardId),
            updatedAt: new Date(),
          },
          selectedCardId: selectedCardId === cardId ? null : selectedCardId,
        })
      },

      // Update a card's properties
      updateCard: (cardId: string, updates: Partial<DashboardCard>) => {
        const { layout } = get()
        if (!layout) return

        set({
          layout: {
            ...layout,
            cards: layout.cards.map((card) =>
              card.id === cardId
                ? { ...card, ...updates, updatedAt: new Date() }
                : card
            ),
            updatedAt: new Date(),
          },
        })
      },

      // Update card position (for drag and drop)
      updateCardPosition: (cardId: string, delta: { x: number; y: number }) => {
        const { layout } = get()
        if (!layout) return

        set({
          layout: {
            ...layout,
            cards: layout.cards.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    position: {
                      ...card.position,
                      x: card.position.x + delta.x,
                      y: card.position.y + delta.y,
                    },
                    updatedAt: new Date(),
                  }
                : card
            ),
            updatedAt: new Date(),
          },
        })
      },

      // Update card size (for edge resize)
      updateCardSize: (cardId: string, dimensions: CardDimensions, positionDelta?: { x: number; y: number }) => {
        const { layout } = get()
        if (!layout) return

        set({
          layout: {
            ...layout,
            cards: layout.cards.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    size: CardSize.CUSTOM,
                    customDimensions: dimensions,
                    position: positionDelta
                      ? {
                          ...card.position,
                          x: card.position.x + positionDelta.x,
                          y: card.position.y + positionDelta.y,
                        }
                      : card.position,
                    updatedAt: new Date(),
                  }
                : card
            ),
            updatedAt: new Date(),
          },
        })
      },

      // Toggle edit mode
      toggleEditMode: () => {
        set((state) => ({
          isEditMode: !state.isEditMode,
          selectedCardId: null,
        }))
      },

      // Select a card
      selectCard: (cardId: string | null) => {
        set({ selectedCardId: cardId })
      },

      // Reset layout to default
      resetLayout: () => {
        set({
          layout: createDefaultLayout(),
          selectedCardId: null,
        })
      },

      // Reorder cards in circular layout (output is center-relative → add canvas center offset)
      reorderCards: () => {
        const { layout } = get()
        if (!layout) return

        const positions = generateCircularLayout(layout.cards, DEFAULT_LAYOUT_CONFIG)

        set({
          layout: {
            ...layout,
            cards: layout.cards.map((card, index) => ({
              ...card,
              position: {
                ...positions[index],
                x: positions[index].x + CANVAS_WIDTH / 2,
                y: positions[index].y + CANVAS_HEIGHT / 2,
              },
              updatedAt: new Date(),
            })),
            updatedAt: new Date(),
          },
        })
      },

      // Apply a layout template (template positions are center-relative → add canvas center offset)
      applyLayoutTemplate: (template: LayoutTemplate) => {
        const newLayout = applyTemplate(template)
        const cardsInCanvasSpace = newLayout.cards.map((card) => ({
          ...card,
          position: {
            ...card.position,
            x: card.position.x + CANVAS_WIDTH / 2,
            y: card.position.y + CANVAS_HEIGHT / 2,
          },
        }))
        set({
          layout: { ...newLayout, cards: cardsInCanvasSpace },
          selectedCardId: null,
        })
      },

      setLayout: (layout) => {
        if (!layout) {
          set({ layout: null })
          return
        }
        const normalizedCards = layout.cards.map((card) => ({
          ...card,
          createdAt: card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt),
          updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt),
        }))
        set({
          layout: {
            ...layout,
            cards: normalizedCards,
            createdAt: layout.createdAt instanceof Date ? layout.createdAt : new Date(layout.createdAt),
            updatedAt: layout.updatedAt instanceof Date ? layout.updatedAt : new Date(layout.updatedAt),
          },
          selectedCardId: null,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: LAYOUT_VERSION,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2 && persistedState != null && typeof persistedState === 'object') {
          const state = persistedState as { layout?: DashboardLayout }
          if (state.layout?.cards) {
            state.layout = {
              ...state.layout,
              cards: state.layout.cards.map((card) => ({
                ...card,
                position: {
                  ...card.position,
                  x: card.position.x + CANVAS_WIDTH / 2,
                  y: card.position.y + CANVAS_HEIGHT / 2,
                },
              })),
            }
          }
        }
        return persistedState
      },
      partialize: (state) => ({
        layout: state.layout,
      }),
    }
  )
)
