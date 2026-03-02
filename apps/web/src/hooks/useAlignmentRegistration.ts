import { useEffect, useRef } from 'react'
import { useAlignmentStore } from '@/store/alignment-store'

interface UseAlignmentRegistrationProps {
  id: string
  ref: React.RefObject<HTMLElement | null>
  isEditMode: boolean
  isDragging: boolean
  isResizing: boolean
}

function getBoundsFromElement(id: string, element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  return {
    id,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  }
}

/**
 * Registers an element's screen-space bounds with the alignment store.
 * When the element is being dragged or resized, it becomes the "active" element
 * and alignment lines + snap offsets are calculated against all other registered elements.
 */
export function useAlignmentRegistration({
  id,
  ref,
  isEditMode,
  isDragging,
  isResizing,
}: UseAlignmentRegistrationProps) {
  // Use refs to avoid stale closures and prevent infinite loops
  const idRef = useRef(id)
  idRef.current = id

  // Register static bounds when entering edit mode
  useEffect(() => {
    if (!isEditMode || !ref.current) return

    const { registerElement, unregisterElement } = useAlignmentStore.getState()

    const updateBounds = () => {
      if (!ref.current) return
      registerElement(getBoundsFromElement(idRef.current, ref.current))
    }

    updateBounds()

    window.addEventListener('resize', updateBounds)
    return () => {
      window.removeEventListener('resize', updateBounds)
      unregisterElement(idRef.current)
    }
  }, [isEditMode, ref])

  // Track active state when dragging or resizing
  useEffect(() => {
    const { setActiveElement } = useAlignmentStore.getState()

    if (isDragging || isResizing) {
      setActiveElement(idRef.current)
    } else {
      // Only clear if THIS element was the active one
      const currentActiveId = useAlignmentStore.getState().activeId
      if (currentActiveId === idRef.current) {
        setActiveElement(null)
      }
    }
  }, [isDragging, isResizing])

  // Update bounds continuously while dragging/resizing using RAF
  useEffect(() => {
    if (!isDragging && !isResizing) return
    if (!ref.current) return

    let rafId: number

    const updateLoop = () => {
      if (!ref.current) return
      const { updateActiveBounds } = useAlignmentStore.getState()
      updateActiveBounds(getBoundsFromElement(idRef.current, ref.current))
      rafId = requestAnimationFrame(updateLoop)
    }

    rafId = requestAnimationFrame(updateLoop)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isDragging, isResizing, ref])
}
