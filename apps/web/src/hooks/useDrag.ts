'use client'

import { useCallback, useRef, useState } from 'react'

const TAP_THRESHOLD = 5

interface UseDragOptions {
  onDragEnd?: (delta: { x: number; y: number }) => void
  /** Called when pointer is released with minimal movement (treated as tap/click) */
  onTap?: () => void
  disabled?: boolean
}

interface UseDragReturn {
  isDragging: boolean
  dragDelta: { x: number; y: number }
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent) => void
  }
}

export function useDrag({
  onDragEnd,
  onTap,
  disabled = false,
}: UseDragOptions = {}): UseDragReturn {
  const [isDragging, setIsDragging] = useState(false)
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const onDragEndRef = useRef(onDragEnd)
  const onTapRef = useRef(onTap)
  onDragEndRef.current = onDragEnd
  onTapRef.current = onTap

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

      const onMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault()
        const deltaX = moveEvent.clientX - dragStartRef.current.x
        const deltaY = moveEvent.clientY - dragStartRef.current.y
        setDragDelta({ x: deltaX, y: deltaY })
      }

      const onUp = (upEvent: PointerEvent) => {
        target.releasePointerCapture(upEvent.pointerId)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)

        const finalDelta = {
          x: upEvent.clientX - dragStartRef.current.x,
          y: upEvent.clientY - dragStartRef.current.y,
        }

        const moved = Math.abs(finalDelta.x) > TAP_THRESHOLD || Math.abs(finalDelta.y) > TAP_THRESHOLD
        if (moved) {
          onDragEndRef.current?.(finalDelta)
        } else {
          onTapRef.current?.()
        }

        setIsDragging(false)
        setDragDelta({ x: 0, y: 0 })
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [disabled]
  )

  return {
    isDragging,
    dragDelta,
    dragHandlers: {
      onPointerDown: handlePointerDown,
    },
  }
}
