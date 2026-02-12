'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/hooks/useDashboard'
import { useNavStore } from '@/store/nav-store'
import { useAlignmentStore } from '@/store/alignment-store'
import { useAlignmentRegistration } from '@/hooks/useAlignmentRegistration'
import { useDrag } from '@/hooks/useDrag'
import { useResize } from '@/hooks/useResize'
import { NavItem } from './NavItem'
import { navItems } from './nav-items'
import { NavToolbar } from './NavToolbar'
import { ResizeHandles } from '@/components/dashboard/ResizeHandles'

const NAV_ELEMENT_ID = 'nav-component'

export function Nav() {
  const pathname = usePathname()
  const { isEditMode } = useDashboard()
  const { config, updatePosition, updateSize, setResizing } = useNavStore()

  const isHomepage = pathname === '/'
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [navSize, setNavSize] = useState({ width: 200, height: 60 })
  const rafIdRef = useRef<number | null>(null)
  
  // Store current indicator position to avoid unnecessary updates
  const indicatorPositionRef = useRef<{
    x: number
    y: number
    width: number
    height: number
    scale: number
    opacity: number
  } | null>(null)

  // Filter visible items
  const visibleNavItems = navItems.filter((item) => config.visibleItems.includes(item.id))

  // Measure nav size when not using custom size
  useEffect(() => {
    if (navRef.current && !config.customSize) {
      const rect = navRef.current.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setNavSize({ width: rect.width, height: rect.height })
      }
    }
  }, [config.customSize, visibleNavItems.length])

  // Use shared drag hook (always vertical layout)
  const { isDragging, dragDelta, dragHandlers } = useDrag({
    onDragEnd: (delta) => {
      // Read fresh snapOffset from store to avoid stale closure
      const currentSnapOffset = useAlignmentStore.getState().snapOffset
      const finalDelta = {
        x: delta.x + (currentSnapOffset?.x ?? 0),
        y: delta.y + (currentSnapOffset?.y ?? 0),
      }
      updatePosition(finalDelta, false)
    },
    disabled: !isEditMode,
  })

  // Use shared resize hook
  const baseSize = config.customSize || navSize
  const {
    isResizing,
    positionDelta: resizePositionDelta,
    handleResizeStart,
  } = useResize({
    initialSize: baseSize,
    constraints: { minWidth: 60, minHeight: 60, maxWidth: 600, maxHeight: 600 },
    onResizeEnd: (size, positionDelta) => {
      updateSize(size)
      if (positionDelta.x !== 0 || positionDelta.y !== 0) {
        updatePosition(positionDelta, false)
      }
      setResizing(false)
    },
  })

  // Sync resizing state to store
  useEffect(() => {
    if (isResizing) {
      setResizing(true)
    }
  }, [isResizing, setResizing])

  // Register with alignment system for guides and snap
  useAlignmentRegistration({
    id: NAV_ELEMENT_ID,
    ref: navRef,
    isEditMode,
    isDragging,
    isResizing,
  })

  // Direct DOM manipulation for smoother animation
  const updateIndicatorPosition = useCallback((
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number = 1,
    opacity: number = 1
  ) => {
    const indicator = indicatorRef.current
    if (!indicator) return
    
    // Skip if position hasn't changed significantly (reduce unnecessary updates)
    const current = indicatorPositionRef.current
    if (current) {
      const threshold = 0.5
      if (
        Math.abs(current.x - x) < threshold &&
        Math.abs(current.y - y) < threshold &&
        Math.abs(current.width - width) < threshold &&
        Math.abs(current.height - height) < threshold &&
        current.scale === scale &&
        current.opacity === opacity
      ) {
        return
      }
    }
    
    // Update ref for next comparison
    indicatorPositionRef.current = { x, y, width, height, scale, opacity }
    
    // Direct DOM manipulation - no React re-render
    // Use translate3d to force GPU acceleration
    indicator.style.width = `${width}px`
    indicator.style.height = `${height}px`
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
    indicator.style.opacity = `${opacity}`
  }, [])
  
  const handleMouseEnter = useCallback(
    (index: number, element: HTMLElement) => {
      if (isEditMode) return
      setHoverIndex(index)
      
      // Cancel previous animation frame if exists
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
      
      // Use requestAnimationFrame for smooth updates
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        const rect = element.getBoundingClientRect()
        const container = navRef.current?.querySelector('[data-nav-items]')
        const containerRect = container?.getBoundingClientRect()
        if (containerRect && indicatorRef.current) {
          const x = rect.left - containerRect.left
          const y = rect.top - containerRect.top
          updateIndicatorPosition(x, y, rect.width, rect.height, 0.95, 1)
        }
      })
    },
    [isEditMode, updateIndicatorPosition]
  )

  // Update indicator to active item position
  const updateIndicatorToActive = useCallback(() => {
    if (!navRef.current || !indicatorRef.current) return
    
    // Cancel previous animation frame if exists
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
    }
    
    // Use requestAnimationFrame for smooth updates
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      const navItemsContainer = navRef.current?.querySelector('[data-nav-items]')
      if (!navItemsContainer) return
      const links = navItemsContainer.querySelectorAll<HTMLAnchorElement>('a')
      const containerRect = navItemsContainer.getBoundingClientRect()
      let activeEl: HTMLAnchorElement | null = null
      links.forEach((link) => {
        if (link.getAttribute('href') === pathname) {
          activeEl = link
        }
      })
      if (!activeEl) {
        updateIndicatorPosition(0, 0, 0, 0, 1, 0)
        return
      }
      const rect = (activeEl as HTMLElement).getBoundingClientRect()
      const x = rect.left - containerRect.left
      const y = rect.top - containerRect.top
      updateIndicatorPosition(x, y, rect.width, rect.height, 1, 1)
    })
  }, [pathname, updateIndicatorPosition])

  // Sync indicator to active item on pathname change
  useLayoutEffect(() => {
    // Always update on pathname change, regardless of hover state
    setHoverIndex(null)
    // Use useLayoutEffect for synchronous update before paint
    updateIndicatorToActive()
  }, [pathname, updateIndicatorToActive])
  
  // Additional update after layout settles (for view transitions)
  useEffect(() => {
    let frame1: number
    let frame2: number
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        updateIndicatorToActive()
      })
    })
    return () => {
      if (frame1) cancelAnimationFrame(frame1)
      if (frame2) cancelAnimationFrame(frame2)
    }
  }, [pathname, updateIndicatorToActive])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
    updateIndicatorToActive()
  }, [updateIndicatorToActive])

  // Only show view transition when not in edit mode and using auto layout
  const showViewTransition = !isEditMode && config.layout === 'auto'

  // Calculate total offset using layout-specific position
  const position = config.verticalPosition
  const totalX = position.x + dragDelta.x + (isResizing ? resizePositionDelta.x : 0)
  const totalY = position.y + dragDelta.y + (isResizing ? resizePositionDelta.y : 0)

  return (
    <nav
      ref={navRef}
      className={cn(
        'fixed z-50 group',
        'rounded-2xl bg-surface-glass backdrop-blur-lg',
        'border border-line-glass',
        '[box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1)]',
        isEditMode && 'cursor-grab active:cursor-grabbing',
        isEditMode && 'ring-2 ring-accent-primary/50',
        isDragging && 'opacity-80',
        !(isDragging || isResizing) && 'transition-all duration-300 ease-out'
      )}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '12px',
        width: undefined,
        height: undefined,
        viewTransitionName: showViewTransition ? 'main-nav' : undefined,
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${totalX}px), calc(-50% + ${totalY}px))`,
      }}
      onPointerDown={isEditMode ? dragHandlers.onPointerDown : undefined}
      onMouseLeave={handleMouseLeave}
    >
      {/* Edit mode toolbar */}
      {isEditMode && <NavToolbar />}

      {/* Site logo and blogger name */}
      <div
        className={cn(
          'flex flex-col items-center gap-2',
          isHomepage && 'pb-3 mb-2 border-b border-line-glass'
        )}
      >
        <Image
          src="/images/avatar/avatar-pink.png"
          alt="Kenanyah"
          width={isHomepage ? 48 : 36}
          height={isHomepage ? 48 : 36}
          className="rounded-full transition-all duration-300"
          style={{ viewTransitionName: 'nav-avatar' }}
        />
        <span
          className={cn(
            'text-sm font-medium text-content-primary transition-all duration-300',
            isHomepage ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0 overflow-hidden'
          )}
          style={{ viewTransitionName: 'nav-name' }}
        >
          Kenanyah
        </span>
      </div>

      {/* Nav items container */}
      <div data-nav-items className={cn('relative flex flex-col justify-center', isHomepage ? 'min-w-30 gap-1' : 'gap-0 items-center')}>
        {/* Hover indicator */}
        {!isEditMode && (
          <div
            ref={indicatorRef}
            className="absolute rounded-xl bg-accent-primary-light"
            style={{
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              opacity: 0,
              transform: 'translate3d(0, 0, 0) scale(1)',
              pointerEvents: 'none',
              willChange: 'transform, opacity, width, height',
              transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease-out, width 150ms cubic-bezier(0.4, 0, 0.2, 1), height 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )}

        {/* Nav items */}
        {visibleNavItems.map((item, index) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={pathname === item.href}
            isHovered={hoverIndex === index}
            isAnyHovered={hoverIndex !== null}
            isCompact={!isHomepage}
            onMouseEnter={(el) => handleMouseEnter(index, el)}
          />
        ))}
      </div>

      {/* Resize handles in edit mode */}
      {isEditMode && <ResizeHandles onResizeStart={handleResizeStart} />}
    </nav>
  )
}
