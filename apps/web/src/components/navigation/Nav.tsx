'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/hooks/useDashboard'
import { useNavStore } from '@/store/nav-store'
import { useDrag } from '@/hooks/useDrag'
import { useResize } from '@/hooks/useResize'
import { NavItem } from './NavItem'
import { navItems } from './nav-items'
import { NavToolbar } from './NavToolbar'
import { ResizeHandles } from '@/components/dashboard/ResizeHandles'

export function Nav() {
  const pathname = usePathname()
  const { isEditMode } = useDashboard()
  const { config, updatePosition, updateSize, setResizing } = useNavStore()

  const isHomepage = pathname === '/'
  const navRef = useRef<HTMLElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({})
  const [navSize, setNavSize] = useState({ width: 200, height: 60 })

  // Determine layout based on config
  const isHorizontal =
    config.layout === 'horizontal' || (config.layout === 'auto' && isHomepage)

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
  }, [config.customSize, visibleNavItems.length, isHorizontal])

  // Use shared drag hook
  const { isDragging, dragDelta, dragHandlers } = useDrag({
    onDragEnd: (delta) => {
      updatePosition(delta, isHorizontal)
    },
    disabled: !isEditMode,
  })

  // Use shared resize hook
  const baseSize = config.customSize || navSize
  const {
    isResizing,
    currentSize: resizeCurrentSize,
    positionDelta: resizePositionDelta,
    handleResizeStart,
  } = useResize({
    initialSize: baseSize,
    constraints: { minWidth: 60, minHeight: 60, maxWidth: 600, maxHeight: 600 },
    onResizeEnd: (size, positionDelta) => {
      updateSize(size)
      if (positionDelta.x !== 0 || positionDelta.y !== 0) {
        updatePosition(positionDelta, isHorizontal)
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

  const handleMouseEnter = useCallback(
    (index: number, element: HTMLElement) => {
      if (isEditMode) return
      setHoverIndex(index)
      const rect = element.getBoundingClientRect()
      const navRect = navRef.current?.getBoundingClientRect()
      if (navRect) {
        setIndicatorStyle({
          width: rect.width,
          height: rect.height,
          transform: isHorizontal
            ? `translateX(${rect.left - navRect.left - 8}px)`
            : `translateY(${rect.top - navRect.top - 8}px)`,
          opacity: 1,
        })
      }
    },
    [isHorizontal, isEditMode]
  )

  // Update indicator to active item position
  const updateIndicatorToActive = useCallback(() => {
    if (!navRef.current) return
    const links = navRef.current.querySelectorAll<HTMLAnchorElement>('a')
    const navRect = navRef.current.getBoundingClientRect()
    let activeEl: HTMLAnchorElement | null = null
    links.forEach((link) => {
      if (link.getAttribute('href') === pathname) {
        activeEl = link
      }
    })
    if (!activeEl) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
      return
    }
    const rect = (activeEl as HTMLElement).getBoundingClientRect()
    setIndicatorStyle({
      width: rect.width,
      height: rect.height,
      transform: isHorizontal
        ? `translateX(${rect.left - navRect.left - 8}px)`
        : `translateY(${rect.top - navRect.top - 8}px)`,
      opacity: 1,
    })
  }, [pathname, isHorizontal])

  // Sync indicator to active item on pathname change
  useEffect(() => {
    if (hoverIndex === null) {
      updateIndicatorToActive()
    }
  }, [pathname, hoverIndex, updateIndicatorToActive])

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
    updateIndicatorToActive()
  }, [updateIndicatorToActive])

  // Calculate current size
  const currentSize = isResizing ? resizeCurrentSize : baseSize

  // Only show view transition when not in edit mode and using auto layout
  const showViewTransition = !isEditMode && config.layout === 'auto'

  // Calculate total offset using layout-specific position
  const position = isHorizontal ? config.horizontalPosition : config.verticalPosition
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
        flexDirection: isHorizontal ? 'row' : 'column',
        gap: '4px',
        padding: '8px',
        width: config.customSize && isHomepage ? currentSize.width : undefined,
        height: config.customSize && isHomepage ? currentSize.height : undefined,
        viewTransitionName: showViewTransition ? 'main-nav' : undefined,
        // Use fixed positioning (top: 0, left: 0) with translate for smooth view transitions
        top: 0,
        left: 0,
        transform: isHorizontal
          ? `translate(calc(50vw + ${totalX}px), calc(32px + ${totalY}px)) translateX(-50%)`
          : `translate(calc(16px + ${totalX}px), calc(50vh + ${totalY}px)) translateY(-50%)`,
      }}
      onPointerDown={isEditMode ? dragHandlers.onPointerDown : undefined}
      onPointerMove={isDragging ? dragHandlers.onPointerMove : undefined}
      onPointerUp={isDragging ? dragHandlers.onPointerUp : undefined}
      onMouseLeave={handleMouseLeave}
    >
      {/* Edit mode toolbar */}
      {isEditMode && <NavToolbar />}

      {/* Hover indicator */}
      {!isEditMode && (
        <div
          className="absolute rounded-xl bg-surface-primary shadow-sm transition-all duration-300 ease-out"
          style={{
            ...indicatorStyle,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Nav items */}
      {visibleNavItems.map((item, index) => (
        <NavItem
          key={item.id}
          item={item}
          isHorizontal={isHorizontal}
          isActive={pathname === item.href}
          isHovered={hoverIndex === index}
          onMouseEnter={(el) => handleMouseEnter(index, el)}
        />
      ))}

      {/* Resize handles in edit mode */}
      {isEditMode && <ResizeHandles onResizeStart={handleResizeStart} />}
    </nav>
  )
}
