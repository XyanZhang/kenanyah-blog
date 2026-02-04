'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDashboard } from '@/hooks/useDashboard'
import { useAlignmentStore } from '@/store/alignment-store'
import { DashboardCard } from './DashboardCard'
import { EditModeToggle } from './EditModeToggle'
import { AddCardDialog, AddCardDialogHandle } from './AddCardButton'
import { LayoutTemplatePickerDialog, LayoutTemplatePickerHandle } from './LayoutTemplatePicker'

export function Dashboard() {
  const { layout, isLoading, initializeLayout, updateCardPosition } = useDashboard()
  const { setActiveElement } = useAlignmentStore()

  // Dialog refs
  const addCardDialogRef = useRef<AddCardDialogHandle>(null)
  const layoutPickerDialogRef = useRef<LayoutTemplatePickerHandle>(null)

  // Dialog handlers
  const handleAddCard = useCallback(() => {
    addCardDialogRef.current?.open()
  }, [])

  const handleSelectLayout = useCallback(() => {
    layoutPickerDialogRef.current?.open()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    initializeLayout()
  }, [initializeLayout])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event

    if (delta.x !== 0 || delta.y !== 0) {
      // Read fresh snapOffset from store to avoid stale closure
      const currentSnapOffset = useAlignmentStore.getState().snapOffset
      const finalDelta = {
        x: delta.x + (currentSnapOffset?.x ?? 0),
        y: delta.y + (currentSnapOffset?.y ?? 0),
      }
      updateCardPosition(active.id as string, finalDelta)
    }

    setActiveElement(null)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-content-muted">Loading dashboard...</div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-content-muted">No layout found</div>
      </div>
    )
  }

  const visibleCards = layout.cards.filter((card) => card.visible)

  // Sort cards by animationPriority for staggered animation
  const sortedCardsForAnimation = [...visibleCards].sort((a, b) => {
    const priorityA = a.animationPriority ?? Infinity
    const priorityB = b.animationPriority ?? Infinity
    return priorityA - priorityB
  })

  // Create a map of card id to animation index
  const animationIndexMap = new Map(
    sortedCardsForAnimation.map((card, index) => [card.id, index])
  )

  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      style={{ background: 'var(--theme-bg-base)' }}
    >
      {/* Nightscape bokeh light orbs with floating animation */}
      <div className="bokeh-orb bokeh-orb-1 absolute top-[8%] left-[12%] h-72 w-72 rounded-full opacity-70 blur-3xl" style={{ background: 'var(--theme-bg-orb-1)' }} />
      <div className="bokeh-orb bokeh-orb-2 absolute top-[15%] right-[8%] h-96 w-96 rounded-full opacity-60 blur-3xl" style={{ background: 'var(--theme-bg-orb-2)' }} />
      <div className="bokeh-orb bokeh-orb-3 absolute bottom-[20%] left-[5%] h-80 w-80 rounded-full opacity-50 blur-3xl" style={{ background: 'var(--theme-bg-orb-3)' }} />
      <div className="bokeh-orb bokeh-orb-4 absolute bottom-[10%] right-[15%] h-64 w-64 rounded-full opacity-65 blur-3xl" style={{ background: 'var(--theme-bg-orb-4)' }} />
      <div className="bokeh-orb bokeh-orb-5 absolute top-[45%] left-[35%] h-56 w-56 rounded-full opacity-40 blur-3xl" style={{ background: 'var(--theme-bg-orb-5)' }} />
      <div className="bokeh-orb bokeh-orb-6 absolute top-[5%] left-[55%] h-48 w-48 rounded-full opacity-55 blur-3xl" style={{ background: 'var(--theme-bg-orb-6)' }} />
      <div className="bokeh-orb bokeh-orb-7 absolute bottom-[35%] right-[30%] h-40 w-40 rounded-full opacity-45 blur-2xl" style={{ background: 'var(--theme-bg-orb-7)' }} />
      <div className="bokeh-orb bokeh-orb-8 absolute top-[60%] left-[65%] h-36 w-36 rounded-full opacity-50 blur-2xl" style={{ background: 'var(--theme-bg-orb-8)' }} />

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {visibleCards.map((card) => (
            <DashboardCard
              key={card.id}
              card={card}
              animationIndex={animationIndexMap.get(card.id) ?? 0}
            />
          ))}
        </div>
      </DndContext>

      <EditModeToggle onAddCard={handleAddCard} onSelectLayout={handleSelectLayout} />
      <AddCardDialog ref={addCardDialogRef} />
      <LayoutTemplatePickerDialog ref={layoutPickerDialogRef} />
    </div>
  )
}
