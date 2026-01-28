'use client'

import { useCallback, useRef, useState } from 'react'

interface UseDragOptions {
  onDragEnd?: (delta: { x: number; y: number }) => void
  disabled?: boolean
}

interface UseDragReturn {
  isDragging: boolean
  dragDelta: { x: number; y: number }
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }
}

export function useDrag({ onDragEnd, disabled = false }: UseDragOptions = {}): UseDragReturn {
  const [isDragging, setIsDragging] = useState(false)
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const onDragEndRef = useRef(onDragEnd)
  onDragEndRef.current = onDragEnd

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return

      e.preventDefault()
      e.stopPropagation()

      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      dragStartRef.current = { x: e.clientX, y: e.clientY }
      setIsDragging(true)
      setDragDelta({ x: 0, y: 0 })
    },
    [disabled]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      e.preventDefault()

      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      setDragDelta({ x: deltaX, y: deltaY })
    },
    [isDragging]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return

      const target = e.currentTarget as HTMLElement
      target.releasePointerCapture(e.pointerId)

      const finalDelta = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      }

      if (finalDelta.x !== 0 || finalDelta.y !== 0) {
        onDragEndRef.current?.(finalDelta)
      }

      setIsDragging(false)
      setDragDelta({ x: 0, y: 0 })
    },
    [isDragging]
  )

  return {
    isDragging,
    dragDelta,
    dragHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  }
}
