'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const TAP_THRESHOLD = 5

interface UseDragOptions {
  onDragMove?: (delta: { x: number; y: number }) => void
  onDragEnd?: (delta: { x: number; y: number }) => void
  /** Called when pointer is released with minimal movement (treated as tap/click) */
  onTap?: () => void
  disabled?: boolean
  syncDragDelta?: boolean
}

interface UseDragReturn {
  isDragging: boolean
  dragDelta: { x: number; y: number }
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent) => void
  }
}

export function useDrag({
  onDragMove,
  onDragEnd,
  onTap,
  disabled = false,
  syncDragDelta = true,
}: UseDragOptions = {}): UseDragReturn {
  const [isDragging, setIsDragging] = useState(false)
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const onDragMoveRef = useRef(onDragMove)
  const onDragEndRef = useRef(onDragEnd)
  const onTapRef = useRef(onTap)
  const rafIdRef = useRef<number | null>(null)
  const pendingDeltaRef = useRef<{ x: number; y: number } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  onDragMoveRef.current = onDragMove
  onDragEndRef.current = onDragEnd
  onTapRef.current = onTap

  const cancelScheduledDelta = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const scheduleDeltaUpdate = useCallback(
    (delta: { x: number; y: number }) => {
      if (!syncDragDelta) return

      pendingDeltaRef.current = delta
      if (rafIdRef.current !== null) return

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        const nextDelta = pendingDeltaRef.current
        if (!nextDelta) return

        setDragDelta((prev) =>
          prev.x === nextDelta.x && prev.y === nextDelta.y ? prev : nextDelta
        )
      })
    },
    [syncDragDelta]
  )

  useEffect(
    () => () => {
      cleanupRef.current?.()
      cancelScheduledDelta()
    },
    [cancelScheduledDelta]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return

      e.preventDefault()
      e.stopPropagation()

      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      cleanupRef.current?.()
      cancelScheduledDelta()
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      setIsDragging(true)
      pendingDeltaRef.current = { x: 0, y: 0 }

      if (syncDragDelta) {
        setDragDelta({ x: 0, y: 0 })
      }

      const onMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault()
        const delta = {
          x: moveEvent.clientX - dragStartRef.current.x,
          y: moveEvent.clientY - dragStartRef.current.y,
        }

        onDragMoveRef.current?.(delta)
        scheduleDeltaUpdate(delta)
      }

      const cleanup = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onCancel)
        cleanupRef.current = null
      }

      const finalize = (
        pointerId: number,
        clientX: number,
        clientY: number,
        cancelled = false
      ) => {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId)
        }

        cleanup()
        cancelScheduledDelta()

        const finalDelta = {
          x: clientX - dragStartRef.current.x,
          y: clientY - dragStartRef.current.y,
        }

        if (!cancelled) {
          const moved =
            Math.abs(finalDelta.x) > TAP_THRESHOLD || Math.abs(finalDelta.y) > TAP_THRESHOLD

          if (moved) {
            onDragEndRef.current?.(finalDelta)
          } else {
            onTapRef.current?.()
          }
        }

        setIsDragging(false)
        pendingDeltaRef.current = null

        if (syncDragDelta) {
          setDragDelta({ x: 0, y: 0 })
        }
      }

      const onUp = (upEvent: PointerEvent) => {
        finalize(upEvent.pointerId, upEvent.clientX, upEvent.clientY)
      }

      const onCancel = (cancelEvent: PointerEvent) => {
        finalize(cancelEvent.pointerId, cancelEvent.clientX, cancelEvent.clientY, true)
      }

      cleanupRef.current = cleanup
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onCancel)
    },
    [cancelScheduledDelta, disabled, scheduleDeltaUpdate, syncDragDelta]
  )

  return {
    isDragging,
    dragDelta,
    dragHandlers: {
      onPointerDown: handlePointerDown,
    },
  }
}
