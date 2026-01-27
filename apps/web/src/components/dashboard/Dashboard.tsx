'use client'

import { useEffect } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDashboard } from '@/hooks/useDashboard'
import { DashboardCard } from './DashboardCard'
import { EditModeToggle } from './EditModeToggle'
import { AddCardButton } from './AddCardButton'

export function Dashboard() {
  const { layout, isEditMode, isLoading, initializeLayout, updateCardPosition } = useDashboard()

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
      updateCardPosition(active.id as string, delta)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-500">No layout found</div>
      </div>
    )
  }

  const visibleCards = layout.cards.filter((card) => card.visible)

  return (
    <div className="relative h-screen w-full overflow-hidden bg-linear-to-br from-purple-100 via-blue-50 to-cyan-50">
      {/* Decorative gradient orbs for visual depth */}
      <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-linear-to-br from-purple-300/20 to-blue-300/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-linear-to-tr from-cyan-300/20 to-purple-300/20 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-r from-blue-200/10 to-purple-200/10 blur-3xl" />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {visibleCards.map((card, index) => (
            <DashboardCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </DndContext>

      <EditModeToggle />
      {isEditMode && <AddCardButton />}
    </div>
  )
}
