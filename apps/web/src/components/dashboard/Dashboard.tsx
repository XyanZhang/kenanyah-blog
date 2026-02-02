'use client'

import { useEffect, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDashboard } from '@/hooks/useDashboard'
import { useAlignmentGuides } from '@/hooks/useAlignmentGuides'
import { DashboardCard } from './DashboardCard'
import { EditModeToggle } from './EditModeToggle'
import { AddCardButton } from './AddCardButton'
import { AlignmentGuides } from './AlignmentGuides'
import { LayoutTemplatePicker } from './LayoutTemplatePicker'

export function Dashboard() {
  const { layout, isEditMode, isLoading, initializeLayout, updateCardPosition } = useDashboard()

  // 拖拽状态追踪
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 })

  // 计算辅助线
  const { alignmentLines, snapOffset } = useAlignmentGuides({
    cards: layout?.cards ?? [],
    activeCardId,
    dragDelta,
  })

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string)
    setDragDelta({ x: 0, y: 0 })
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const { delta } = event
    setDragDelta({ x: delta.x, y: delta.y })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event

    if (delta.x !== 0 || delta.y !== 0) {
      // 应用吸附效果
      const finalDelta = {
        x: delta.x + (snapOffset?.x ?? 0),
        y: delta.y + (snapOffset?.y ?? 0),
      }
      updateCardPosition(active.id as string, finalDelta)
    }

    setActiveCardId(null)
    setDragDelta({ x: 0, y: 0 })
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
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
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
          {/* 辅助线 */}
          <AlignmentGuides lines={alignmentLines} isVisible={isEditMode && activeCardId !== null} />
        </div>
      </DndContext>

      <EditModeToggle />
      {isEditMode && <AddCardButton />}
      {isEditMode && <LayoutTemplatePicker />}
    </div>
  )
}
