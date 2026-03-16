'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/hooks/useDashboard'
import { useDashboardStore } from '@/store/dashboard-store'
import { useNavStore } from '@/store/nav-store'
import { useAlignmentStore } from '@/store/alignment-store'
import { useHomeCanvasStore } from '@/store/home-canvas-store'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants/dashboard'
import { useAlignmentRegistration } from '@/hooks/useAlignmentRegistration'
import { useDrag } from '@/hooks/useDrag'
import { useResize } from '@/hooks/useResize'
import { NavItem } from './NavItem'
import { NavToolbar } from './NavToolbar'
import { ResizeHandles } from '@/components/dashboard/ResizeHandles'

const NAV_ELEMENT_ID = 'nav-component'

const DEFAULT_AVATAR = '/images/avatar/avatar-pink.png'

/** 从首页布局中取 Profile 卡片的头像配置，与主卡片保持同步 */
function useProfileAvatarFromLayout(): string {
  const layout = useDashboardStore((s) => s.layout)
  const profileCard = layout?.cards?.find((c) => c.type === 'profile')
  const avatar = profileCard?.config?.avatar
  return (typeof avatar === 'string' && avatar.trim()) ? avatar.trim() : DEFAULT_AVATAR
}

export function Nav() {
  const pathname = usePathname()
  const { isEditMode } = useDashboard()
  const { config, updatePosition, updateSize, setResizing } = useNavStore()
  const avatarSrc = useProfileAvatarFromLayout()

  const isHomepage = pathname === '/'
  const { scale, translateX, translateY, setViewportSize, hasRealViewport } = useHomeCanvasStore()
  const navRef = useRef<HTMLElement>(null)

  // 首页时同步监听窗口 resize，确保缩小/放大窗口时 store 更新、布局跟随
  useEffect(() => {
    if (!isHomepage) return
    const sync = () => setViewportSize(window.innerWidth, window.innerHeight)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [isHomepage, setViewportSize])
  const indicatorRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [navSize, setNavSize] = useState({ width: 200, height: 60 })
  const [hasMeasuredSize, setHasMeasuredSize] = useState(false)
  const [layoutJustChanged, setLayoutJustChanged] = useState(false)
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

  // 从配置取显示项（数据库同步），按 sortOrder 排序
  const visibleNavItems = (config.items ?? [])
    .filter((item) => item.visible !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(({ id, label, href, icon }) => ({ id, label, href, icon }))

  // Measure nav size when not using custom size
  useEffect(() => {
    if (navRef.current && !config.customSize) {
      const rect = navRef.current.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setNavSize({ width: rect.width, height: rect.height })
        setHasMeasuredSize(true)
      }
    }
  }, [config.customSize, visibleNavItems.length])

  // 首页用竖向位置（画布坐标），非首页用横向位置；首页拖拽 delta 需除以 scale 转为画布坐标
  const { isDragging, dragDelta, dragHandlers } = useDrag({
    onDragEnd: (delta) => {
      const currentSnapOffset = useAlignmentStore.getState().snapOffset
      const finalViewportDelta = {
        x: delta.x + (currentSnapOffset?.x ?? 0),
        y: delta.y + (currentSnapOffset?.y ?? 0),
      }
      if (isHomepage) {
        const canvasDelta = {
          x: finalViewportDelta.x / scale,
          y: finalViewportDelta.y / scale,
        }
        updatePosition(canvasDelta, false)
      } else {
        updatePosition(finalViewportDelta, true)
      }
    },
    disabled: !isEditMode,
  })

  // Use shared resize hook
  const baseSize = config.customSize || navSize
  const {
    isResizing,
    currentSize,
    positionDelta: resizePositionDelta,
    handleResizeStart,
  } = useResize({
    initialSize: baseSize,
    constraints: { minWidth: 60, minHeight: 60, maxWidth: 600, maxHeight: 600 },
    onResizeEnd: (size, positionDelta) => {
      updateSize(size)
      if (positionDelta.x !== 0 || positionDelta.y !== 0) {
        if (isHomepage) {
          updatePosition(
            { x: positionDelta.x / scale, y: positionDelta.y / scale },
            false
          )
        } else {
          updatePosition(positionDelta, true)
        }
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

  // 切换时先隐藏 indicator 并标记「布局切换中」，关闭所有 transition 避免多属性互相拉扯
  useLayoutEffect(() => {
    setHoverIndex(null)
    setLayoutJustChanged(true)
    updateIndicatorPosition(0, 0, 0, 0, 1, 0)
  }, [pathname, updateIndicatorPosition])

  // 新布局 paint 后再更新 indicator，再下一帧恢复 transition
  useEffect(() => {
    const frames: number[] = []
    frames[0] = requestAnimationFrame(() => {
      frames[1] = requestAnimationFrame(() => {
        updateIndicatorToActive()
        frames[2] = requestAnimationFrame(() => {
          setLayoutJustChanged(false)
        })
      })
    })
    return () => {
      frames.forEach((id) => id != null && cancelAnimationFrame(id))
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

  const showViewTransition = false

  // 首页：画布坐标系，左上角为原点；非首页：横向顶部
  const position = isHomepage ? config.verticalPosition : config.horizontalPosition
  const baseSizeForPosition = config.customSize || navSize
  const navCanvasLeft = CANVAS_WIDTH / 2 + position.x - baseSizeForPosition.width / 2
  const navCanvasTop = CANVAS_HEIGHT / 2 + position.y - baseSizeForPosition.height / 2
  const homeLeft = translateX + navCanvasLeft * scale + dragDelta.x + (isResizing ? resizePositionDelta.x : 0)
  const homeTop = translateY + navCanvasTop * scale + dragDelta.y + (isResizing ? resizePositionDelta.y : 0)

  // 有自定义尺寸或正在缩放时，使用固定宽高，使内部可自适应；否则由内容撑开
  const useFixedSize = Boolean(config.customSize) || isResizing
  const displaySize = useFixedSize ? currentSize : undefined

  // 首屏只在：1）导航配置已从本地存储 hydrate，2）首页时已获得真实视口、3）无自定义尺寸则已测量一次内容尺寸 后再展示，
  // 避免「从中间位置缓动到配置位置」的跳动感
  const isReady =
    (!isHomepage || hasRealViewport) &&
    (config.customSize ? true : hasMeasuredSize || !isHomepage)

  return (
    <nav
      ref={navRef}
      className={cn(
        'fixed z-50 group left-0 top-0',
        'rounded-2xl bg-surface-glass backdrop-blur-lg',
        'border border-line-glass',
        '[box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1)]',
        isEditMode && 'cursor-grab active:cursor-grabbing',
        isEditMode && 'ring-2 ring-accent-primary/50',
        isDragging && 'opacity-80',
        // 仅在就绪后且非拖拽/缩放/布局切换时启用过渡，避免首屏从默认位置动画跳变
        isReady &&
          !(isDragging || isResizing) &&
          !layoutJustChanged &&
          'transition-all duration-300 ease-out'
      )}
      style={{
        display: 'flex',
        flexDirection: isHomepage ? 'column' : 'row',
        alignItems: isHomepage ? undefined : 'center',
        gap: '4px',
        padding: isHomepage ? '12px' : '8px 12px',
        width: isHomepage ? displaySize?.width : undefined,
        height: isHomepage ? displaySize?.height : undefined,
        minWidth: isHomepage ? undefined : 48,
        minHeight: 48,
        overflow: useFixedSize && !isEditMode ? 'hidden' : 'visible',
        viewTransitionName: showViewTransition ? 'main-nav' : undefined,
        opacity: isReady ? 1 : 0,
        ...(isHomepage
          ? {
              left: homeLeft,
              top: homeTop,
              transform: undefined,
            }
          : {
              left: '20px',
              top: '20px',
            }),
      }}
      onPointerDown={isEditMode ? dragHandlers.onPointerDown : undefined}
      onMouseLeave={handleMouseLeave}
    >
      {isEditMode && <NavToolbar isHomepage={isHomepage} />}

      {/* 头像区：首页大图+名字，非首页小图 */}
      <div
        className={cn(
          'flex items-center shrink-0',
          isHomepage ? 'flex-col gap-2 pb-3 mb-2 border-b border-line-glass' : 'pr-1 border-r border-line-glass'
        )}
      >
        <Image
          src={avatarSrc}
          alt="Kenanyah"
          width={48}
          height={48}
          className={cn('rounded-full', !layoutJustChanged && 'transition-all duration-300',
            isHomepage ? '' : 'mr-2'
          )}
          style={{ viewTransitionName: 'nav-avatar' }}
        />

        {
          isHomepage && (
            <span
              className={cn(
                'text-sm font-medium text-content-primary',
                !layoutJustChanged && 'transition-all duration-300',
                isHomepage ? 'opacity-100' : 'opacity-0 max-h-0 overflow-hidden'
              )}
              style={{ viewTransitionName: 'nav-name' }}
            >
              Kenanyah
            </span>
          )
        }
      </div>

      {/* Nav 项：同一容器，min-w-0 + flex-1 使宽度随 nav 容器自适应 */}
      <div
        data-nav-items
        className={cn(
          'relative min-w-0 flex-1 flex overflow-hidden',
          isHomepage ? 'flex-col justify-center min-w-30 gap-1' : 'flex-row items-center gap-0'
        )}
      >
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
              transition: layoutJustChanged
                ? 'none'
                : 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease-out, width 150ms cubic-bezier(0.4, 0, 0.2, 1), height 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )}
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
      {isEditMode && <ResizeHandles onResizeStart={handleResizeStart} />}
    </nav>
  )
}
