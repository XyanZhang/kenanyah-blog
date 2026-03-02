'use client'

import { useCallback, useRef, useState } from 'react'
import { CardDimensions } from '@blog/types'
import { RESIZE_CONSTRAINTS } from '@/lib/constants/dashboard'
import { type ResizeDirection } from '@/hooks/useResize'

export type { ResizeDirection }

interface UseCardResizeOptions {
  initialDimensions: CardDimensions
  onResizeEnd: (dimensions: CardDimensions, positionDelta: { x: number; y: number }) => void
}

interface UseCardResizeReturn {
  isResizing: boolean
  currentDimensions: CardDimensions
  positionDelta: { x: number; y: number }
  handleResizeStart: (direction: ResizeDirection, e: React.PointerEvent) => void
}

function clampDimension(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function useCardResize({
  initialDimensions,
  onResizeEnd,
}: UseCardResizeOptions): UseCardResizeReturn {
  const [isResizing, setIsResizing] = useState(false)
  const [currentDimensions, setCurrentDimensions] = useState<CardDimensions>(initialDimensions)
  const [positionDelta, setPositionDelta] = useState({ x: 0, y: 0 })

  // Use refs to track latest values for use in event handlers
  const latestDimensionsRef = useRef<CardDimensions>(initialDimensions)
  const latestPositionDeltaRef = useRef({ x: 0, y: 0 })
  const onResizeEndRef = useRef(onResizeEnd)
  onResizeEndRef.current = onResizeEnd

  const stateRef = useRef({
    direction: null as ResizeDirection | null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  })

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const { direction, startX, startY, startWidth, startHeight } = stateRef.current
    if (!direction) return

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    let posX = 0
    let posY = 0

    // East edge
    if (direction.includes('e')) {
      newWidth = startWidth + deltaX
    }
    // West edge: grow width, shift position left
    if (direction.includes('w')) {
      newWidth = startWidth - deltaX
      posX = deltaX
    }
    // South edge
    if (direction.includes('s')) {
      newHeight = startHeight + deltaY
    }
    // North edge: grow height, shift position up
    if (direction.includes('n')) {
      newHeight = startHeight - deltaY
      posY = deltaY
    }

    // Clamp and fix position if clamped
    const clampedWidth = clampDimension(newWidth, RESIZE_CONSTRAINTS.minWidth, RESIZE_CONSTRAINTS.maxWidth)
    const clampedHeight = clampDimension(newHeight, RESIZE_CONSTRAINTS.minHeight, RESIZE_CONSTRAINTS.maxHeight)

    if (direction.includes('w')) {
      posX = startWidth - clampedWidth
    }
    if (direction.includes('n')) {
      posY = startHeight - clampedHeight
    }

    const newDims = { width: clampedWidth, height: clampedHeight }
    const newPos = { x: posX, y: posY }

    // Update refs for use in pointerup handler
    latestDimensionsRef.current = newDims
    latestPositionDeltaRef.current = newPos

    setCurrentDimensions(newDims)
    setPositionDelta(newPos)
  }, [])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const target = e.target as HTMLElement
    target.releasePointerCapture(e.pointerId)

    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)

    // Read from refs to avoid setState-in-render issue
    const finalDimensions = latestDimensionsRef.current
    const finalPositionDelta = latestPositionDeltaRef.current

    setIsResizing(false)
    setPositionDelta({ x: 0, y: 0 })

    // Call onResizeEnd outside of render cycle
    onResizeEndRef.current(finalDimensions, finalPositionDelta)
  }, [handlePointerMove])

  const handleResizeStart = useCallback((direction: ResizeDirection, e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const target = e.target as HTMLElement
    target.setPointerCapture(e.pointerId)

    stateRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: initialDimensions.width,
      startHeight: initialDimensions.height,
    }

    // Initialize refs
    latestDimensionsRef.current = initialDimensions
    latestPositionDeltaRef.current = { x: 0, y: 0 }

    setCurrentDimensions(initialDimensions)
    setPositionDelta({ x: 0, y: 0 })
    setIsResizing(true)

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }, [initialDimensions, handlePointerMove, handlePointerUp])

  return {
    isResizing,
    currentDimensions: isResizing ? currentDimensions : initialDimensions,
    positionDelta: isResizing ? positionDelta : { x: 0, y: 0 },
    handleResizeStart,
  }
}
