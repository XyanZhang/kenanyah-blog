'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { LayoutGroup, motion } from 'framer-motion'
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
import type { NavItem as NavItemType } from './nav-items'
import { NavToolbar } from './NavToolbar'
import { ResizeHandles } from '@/components/dashboard/ResizeHandles'

const NAV_ELEMENT_ID = 'nav-component'
const DEFAULT_AVATAR = '/images/avatar/avatar-pink.png'

const NAV_SHELL_SPRING = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 30,
  mass: 0.9,
}

const NAV_LAYOUT_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 34,
  mass: 0.82,
}

const NAV_IMMEDIATE_TRANSITION = { duration: 0 }

const NAV_TEXT_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
}

const NAV_CONTENT_SWAP_DELAY_MS = 0

/** 从首页布局中取 Profile 卡片的头像配置，与主卡片保持同步 */
function useProfileAvatarFromLayout(): string {
  const layout = useDashboardStore((s) => s.layout)
  const profileCard = layout?.cards?.find((c) => c.type === 'profile')
  const avatar = profileCard?.config?.avatar
  return typeof avatar === 'string' && avatar.trim() ? avatar.trim() : DEFAULT_AVATAR
}

export function Nav() {
  const pathname = usePathname()
  const { isEditMode } = useDashboard()
  const { config, updatePosition, updateSize, setResizing } = useNavStore()
  const avatarSrc = useProfileAvatarFromLayout()

  const isHomepage = pathname === '/'
  const targetMode = isHomepage ? 'home' : 'compact'
  const [contentMode, setContentMode] = useState<'home' | 'compact'>(targetMode)
  const { scale, translateX, translateY, setViewportSize, hasRealViewport } = useHomeCanvasStore()
  const navRef = useRef<HTMLElement>(null)
  const contentModeTimerRef = useRef<number | null>(null)
  const previousTargetModeRef = useRef<'home' | 'compact'>(targetMode)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [measuredSizes, setMeasuredSizes] = useState({
    home: { width: 200, height: 60 },
    compact: { width: 200, height: 60 },
  })
  const [hasMeasuredHomeSize, setHasMeasuredHomeSize] = useState(false)
  const [hasMeasuredCompactSize, setHasMeasuredCompactSize] = useState(false)

  // 同步监听窗口 resize，确保缩小/放大窗口时 store 更新、布局跟随。
  // 即使当前不是首页，也提前同步视口尺寸，这样从其它页面跳转回首页时不会用到默认视口导致导航位置不一致。
  useEffect(() => {
    const previousTargetMode = previousTargetModeRef.current
    previousTargetModeRef.current = targetMode

    if (contentModeTimerRef.current !== null) {
      clearTimeout(contentModeTimerRef.current)
      contentModeTimerRef.current = null
    }

    if (previousTargetMode === targetMode) {
      setContentMode(targetMode)
      return
    }

    contentModeTimerRef.current = window.setTimeout(() => {
      setContentMode(targetMode)
      contentModeTimerRef.current = null
    }, NAV_CONTENT_SWAP_DELAY_MS)

    return () => {
      if (contentModeTimerRef.current !== null) {
        clearTimeout(contentModeTimerRef.current)
        contentModeTimerRef.current = null
      }
    }
  }, [targetMode])

  useEffect(() => {
    const sync = () => setViewportSize(window.innerWidth, window.innerHeight)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [setViewportSize])

  const isVisualHomepage = contentMode === 'home'

  const visibleNavItems: NavItemType[] = useMemo(
    () =>
      (config.items ?? [])
        .filter((item) => item.visible !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(
          ({ id, label, href, icon }) =>
            ({
              id,
              label,
              href,
              icon,
            } as NavItemType)
        ),
    [config.items]
  )

  useEffect(() => {
    if (navRef.current && !config.customSize) {
      const rect = navRef.current.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        const nextSize = { width: rect.width, height: rect.height }
        setMeasuredSizes((current) => {
          const currentSize = current[contentMode]
          if (
            Math.abs(currentSize.width - nextSize.width) < 0.5 &&
            Math.abs(currentSize.height - nextSize.height) < 0.5
          ) {
            return current
          }

            return {
              ...current,
              [contentMode]: nextSize,
            }
          })

        if (contentMode === 'home') {
          setHasMeasuredHomeSize(true)
        } else {
          setHasMeasuredCompactSize(true)
        }
      }
    }
  }, [config.customSize, visibleNavItems.length, isVisualHomepage, contentMode])

  useEffect(() => {
    setHoverIndex(null)
  }, [pathname])

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

  const baseSize = config.customSize || measuredSizes[contentMode]
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

  useEffect(() => {
    if (isResizing) {
      setResizing(true)
    }
  }, [isResizing, setResizing])

  useAlignmentRegistration({
    id: NAV_ELEMENT_ID,
    ref: navRef,
    isEditMode,
    isDragging,
    isResizing,
  })

  const handleMouseEnter = useCallback(
    (index: number) => {
      if (isEditMode) return
      setHoverIndex(index)
    },
    [isEditMode]
  )

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
  }, [])

  const position = isHomepage ? config.verticalPosition : config.horizontalPosition
  const baseSizeForPosition = config.customSize || measuredSizes[targetMode]
  const navCanvasLeft = CANVAS_WIDTH / 2 + position.x - baseSizeForPosition.width / 2
  const navCanvasTop = CANVAS_HEIGHT / 2 + position.y - baseSizeForPosition.height / 2
  const homeLeft = translateX + navCanvasLeft * scale + dragDelta.x + (isResizing ? resizePositionDelta.x : 0)
  const homeTop = translateY + navCanvasTop * scale + dragDelta.y + (isResizing ? resizePositionDelta.y : 0)

  const useFixedSize = Boolean(config.customSize) || isResizing
  const displaySize = useFixedSize ? currentSize : undefined
  const hasMeasuredTargetSize = targetMode === 'home' ? hasMeasuredHomeSize : hasMeasuredCompactSize
  const isReady =
    (!isHomepage || hasRealViewport) &&
    (config.customSize ? true : hasMeasuredTargetSize || !isHomepage)

  const targetX = isHomepage ? homeLeft : 20
  const targetY = isHomepage ? homeTop : 20
  const highlightedIndex =
    hoverIndex ?? visibleNavItems.findIndex((item) => item.href === pathname)
  const animateShell = isReady && !isDragging && !isResizing

  return (
    <motion.div
      initial={false}
      animate={{
        x: targetX,
        y: targetY,
        opacity: isReady ? 1 : 0,
        scale: isDragging ? 0.985 : 1,
      }}
      transition={{
        layout: NAV_LAYOUT_SPRING,
        x: animateShell ? NAV_SHELL_SPRING : NAV_IMMEDIATE_TRANSITION,
        y: animateShell ? NAV_SHELL_SPRING : NAV_IMMEDIATE_TRANSITION,
        opacity: NAV_TEXT_TRANSITION,
        scale: isDragging ? NAV_SHELL_SPRING : NAV_TEXT_TRANSITION,
      }}
      className={cn(
        'fixed left-0 top-0 z-50'
      )}
      style={{
        willChange: animateShell ? 'transform, opacity' : undefined,
        backfaceVisibility: 'hidden',
      }}
    >
      <nav
        ref={navRef}
        className={cn(
          'group rounded-2xl bg-surface-glass backdrop-blur-lg',
          'border border-line-glass',
          '[box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1)]',
          isEditMode && 'cursor-grab active:cursor-grabbing ring-2 ring-accent-primary/50',
          isDragging && 'opacity-80'
        )}
        style={{
          display: 'flex',
          flexDirection: isVisualHomepage ? 'column' : 'row',
          alignItems: isVisualHomepage ? undefined : 'center',
          gap: '4px',
          padding: isVisualHomepage ? '12px' : '8px 12px',
          width: isVisualHomepage ? displaySize?.width : undefined,
          height: isVisualHomepage ? displaySize?.height : undefined,
          minWidth: isVisualHomepage ? undefined : 48,
          minHeight: 48,
          overflow: useFixedSize && !isEditMode ? 'hidden' : 'visible',
          willChange: animateShell ? 'width, height' : undefined,
          backfaceVisibility: 'hidden',
        }}
        onPointerDown={isEditMode ? dragHandlers.onPointerDown : undefined}
        onMouseLeave={handleMouseLeave}
      >
        {isEditMode && <NavToolbar isHomepage={isHomepage} />}

        <div
          className={cn(
            'flex shrink-0 items-center',
            isVisualHomepage ? 'mb-2 flex-col gap-2 border-b border-line-glass pb-3' : 'border-r border-line-glass pr-1'
          )}
        >
          <div>
            <Image
              src={avatarSrc}
              alt="Kenanyah"
              width={48}
              height={48}
              className={cn('rounded-full', isVisualHomepage ? '' : 'mr-2')}
            />
          </div>

          {isVisualHomepage ? (
            <span className="text-sm font-medium text-content-primary">Kenanyah</span>
          ) : null}
        </div>

        <LayoutGroup id="main-nav-items">
          <div
            data-nav-items
            className={cn(
              'relative flex min-w-0 flex-1 overflow-hidden',
              isVisualHomepage ? 'min-w-30 flex-col justify-center gap-1' : 'flex-row items-center gap-0'
            )}
          >
            {visibleNavItems.map((item, index) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={pathname === item.href}
                isHighlighted={highlightedIndex === index}
                isCompact={!isVisualHomepage}
                onMouseEnter={() => handleMouseEnter(index)}
              />
            ))}
          </div>
        </LayoutGroup>

        {isEditMode && <ResizeHandles onResizeStart={handleResizeStart} />}
      </nav>
    </motion.div>
  )
}
