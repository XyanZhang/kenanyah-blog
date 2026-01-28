'use client'

import { useCallback, useRef, useState } from 'react'

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface ResizeConstraints {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

interface UseResizeOptions {
  initialSize: { width: number; height: number }
  constraints?: ResizeConstraints
  onResizeEnd?: (size: { width: number; height: number }, positionDelta: { x: number; y: number }) => void
}

interface UseResizeReturn {
  isResizing: boolean
  currentSize: { width: number; height: number }
  positionDelta: { x: number; y: number }
  handleResizeStart: (direction: ResizeDirection, e: React.PointerEvent) => void
}

const DEFAULT_CONSTRAINTS: ResizeConstraints = {
  minWidth: 60,
  minHeight: 60,
  maxWidth: 800,
  maxHeight: 800,
}

export function useResize({
  initialSize,
  constraints = DEFAULT_CONSTRAINTS,
  onResizeEnd,
}: UseResizeOptions): UseResizeReturn {
  const [isResizing, setIsResizing] = useState(false)
  const [currentSize, setCurrentSize] = useState(initialSize)
  const [positionDelta, setPositionDelta] = useState({ x: 0, y: 0 })

  const stateRef = useRef({
    direction: '' as ResizeDirection | '',
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  })
  const onResizeEndRef = useRef(onResizeEnd)
  onResizeEndRef.current = onResizeEnd

  const { minWidth = 60, minHeight = 60, maxWidth = 800, maxHeight = 800 } = constraints

  const handleResizeStart = useCallback(
    (direction: ResizeDirection, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const target = e.target as HTMLElement
      target.setPointerCapture(e.pointerId)

      stateRef.current = {
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: initialSize.width,
        startHeight: initialSize.height,
      }

      setIsResizing(true)
      setCurrentSize(initialSize)
      setPositionDelta({ x: 0, y: 0 })

      const onMove = (moveEvent: PointerEvent) => {
        const { direction: dir, startX, startY, startWidth, startHeight } = stateRef.current
        const deltaX = moveEvent.clientX - startX
        const deltaY = moveEvent.clientY - startY

        let newWidth = startWidth
        let newHeight = startHeight
        let posX = 0
        let posY = 0

        if (dir.includes('e')) newWidth = startWidth + deltaX
        if (dir.includes('w')) {
          newWidth = startWidth - deltaX
          posX = deltaX
        }
        if (dir.includes('s')) newHeight = startHeight + deltaY
        if (dir.includes('n')) {
          newHeight = startHeight - deltaY
          posY = deltaY
        }

        // Clamp
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))

        // Adjust position delta after clamping
        if (dir.includes('w')) posX = startWidth - newWidth
        if (dir.includes('n')) posY = startHeight - newHeight

        setCurrentSize({ width: newWidth, height: newHeight })
        setPositionDelta({ x: posX, y: posY })
      }

      const onUp = (upEvent: PointerEvent) => {
        target.releasePointerCapture(upEvent.pointerId)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)

        const { direction: dir, startX, startY, startWidth, startHeight } = stateRef.current
        const deltaX = upEvent.clientX - startX
        const deltaY = upEvent.clientY - startY

        let newWidth = startWidth
        let newHeight = startHeight
        let posX = 0
        let posY = 0

        if (dir.includes('e')) newWidth = startWidth + deltaX
        if (dir.includes('w')) {
          newWidth = startWidth - deltaX
          posX = deltaX
        }
        if (dir.includes('s')) newHeight = startHeight + deltaY
        if (dir.includes('n')) {
          newHeight = startHeight - deltaY
          posY = deltaY
        }

        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))

        if (dir.includes('w')) posX = startWidth - newWidth
        if (dir.includes('n')) posY = startHeight - newHeight

        onResizeEndRef.current?.({ width: newWidth, height: newHeight }, { x: posX, y: posY })

        setIsResizing(false)
        setCurrentSize(initialSize)
        setPositionDelta({ x: 0, y: 0 })
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [initialSize, minWidth, minHeight, maxWidth, maxHeight]
  )

  return {
    isResizing,
    currentSize: isResizing ? currentSize : initialSize,
    positionDelta: isResizing ? positionDelta : { x: 0, y: 0 },
    handleResizeStart,
  }
}
