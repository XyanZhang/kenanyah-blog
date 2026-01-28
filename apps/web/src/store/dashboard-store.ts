'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DashboardCard, DashboardLayout, CardType, CardSize, CardDimensions } from '@blog/types'
import { createDefaultLayout, createDefaultCard } from '@/lib/dashboard/default-layout'
import { generateCircularLayout } from '@/lib/dashboard/layout-algorithms'
import { applyTemplate, LayoutTemplate } from '@/lib/dashboard/layout-templates'
import { DEFAULT_LAYOUT_CONFIG, STORAGE_KEY, LAYOUT_VERSION } from '@/lib/constants/dashboard'

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

        // Calculate position for new card
        const allCards = [...existingCards, newCardBase as DashboardCard]
        const positions = generateCircularLayout(allCards, DEFAULT_LAYOUT_CONFIG)
        const newPosition = positions[positions.length - 1]

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

      // Reorder cards in circular layout
      reorderCards: () => {
        const { layout } = get()
        if (!layout) return

        const positions = generateCircularLayout(layout.cards, DEFAULT_LAYOUT_CONFIG)

        set({
          layout: {
            ...layout,
            cards: layout.cards.map((card, index) => ({
              ...card,
              position: positions[index],
              updatedAt: new Date(),
            })),
            updatedAt: new Date(),
          },
        })
      },

      // Apply a layout template
      applyLayoutTemplate: (template: LayoutTemplate) => {
        const newLayout = applyTemplate(template)
        set({
          layout: newLayout,
          selectedCardId: null,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: LAYOUT_VERSION,
      partialize: (state) => ({
        layout: state.layout,
      }),
    }
  )
)
