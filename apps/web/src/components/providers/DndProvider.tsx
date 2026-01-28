'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

interface DragState {
  activeId: string | null
  delta: { x: number; y: number }
}

interface DndContextValue {
  dragState: DragState
}

const DndStateContext = createContext<DndContextValue | null>(null)

export function useDndState() {
  const context = useContext(DndStateContext)
  if (!context) {
    throw new Error('useDndState must be used within DndProvider')
  }
  return context
}

const dragEndHandlers = new Map<string, (event: DragEndEvent) => void>()

export function registerDragEndHandler(id: string, handler: (event: DragEndEvent) => void) {
  dragEndHandlers.set(id, handler)
  return () => {
    dragEndHandlers.delete(id)
  }
}

interface DndProviderProps {
  children: ReactNode
}

export function DndProvider({ children }: DndProviderProps) {
  const [dragState, setDragState] = useState<DragState>({
    activeId: null,
    delta: { x: 0, y: 0 },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragState({
      activeId: event.active.id as string,
      delta: { x: 0, y: 0 },
    })
  }, [])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { delta } = event
    setDragState((prev) => ({
      ...prev,
      delta: { x: delta.x, y: delta.y },
    }))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active } = event
    const handler = dragEndHandlers.get(active.id as string)
    if (handler) {
      handler(event)
    }

    setDragState({
      activeId: null,
      delta: { x: 0, y: 0 },
    })
  }, [])

  return (
    <DndStateContext.Provider value={{ dragState }}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DndContext>
    </DndStateContext.Provider>
  )
}
