'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
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
      updatePosition(delta, false)
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

  const handleMouseEnter = useCallback(
    (index: number, element: HTMLElement) => {
      if (isEditMode) return
      setHoverIndex(index)
      const rect = element.getBoundingClientRect()
      const container = navRef.current?.querySelector('[data-nav-items]')
      const containerRect = container?.getBoundingClientRect()
      if (containerRect) {
        setIndicatorStyle({
          width: rect.width,
          height: rect.height,
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          opacity: 1,
        })
      }
    },
    [isEditMode]
  )

  // Update indicator to active item position
  const updateIndicatorToActive = useCallback(() => {
    if (!navRef.current) return
    const navItemsContainer = navRef.current.querySelector('[data-nav-items]')
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
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
      return
    }
    const rect = (activeEl as HTMLElement).getBoundingClientRect()
    setIndicatorStyle({
      width: rect.width,
      height: rect.height,
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      opacity: 1,
    })
  }, [pathname])

  // Sync indicator to active item on pathname change
  useEffect(() => {
    // Always update on pathname change, regardless of hover state
    setHoverIndex(null)
    // Immediate update for quick feedback
    updateIndicatorToActive()
    // Delayed update to ensure layout is complete after view transition
    const timer = setTimeout(() => {
      updateIndicatorToActive()
    }, 100)
    return () => clearTimeout(timer)
  }, [pathname, updateIndicatorToActive])

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
    updateIndicatorToActive()
  }, [updateIndicatorToActive])

  // Calculate current size
  const currentSize = isResizing ? resizeCurrentSize : baseSize

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
        top: 0,
        left: 0,
        transform: `translate(calc(16px + ${totalX}px), calc(50vh + ${totalY}px)) translateY(-50%)`,
      }}
      onPointerDown={isEditMode ? dragHandlers.onPointerDown : undefined}
      onPointerMove={isDragging ? dragHandlers.onPointerMove : undefined}
      onPointerUp={isDragging ? dragHandlers.onPointerUp : undefined}
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
          src="/images/avatar/kenanyah.png"
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
      <div data-nav-items className={cn('relative flex flex-col', isHomepage ? 'gap-1' : 'gap-0 items-center')}>
        {/* Hover indicator */}
        {!isEditMode && (
          <div
            className="absolute rounded-xl bg-accent-primary-light transition-all duration-300 ease-out"
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
            isActive={pathname === item.href}
            isHovered={hoverIndex === index}
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
