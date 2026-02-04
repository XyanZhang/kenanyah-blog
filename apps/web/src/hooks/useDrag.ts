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

        if (finalDelta.x !== 0 || finalDelta.y !== 0) {
          onDragEndRef.current?.(finalDelta)
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
