'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
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
  const { scale, translateX, translateY, setViewportSize, hasRealViewport } = useHomeCanvasStore()
  const navRef = useRef<HTMLElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [navSize, setNavSize] = useState({ width: 200, height: 60 })
  const [hasMeasuredSize, setHasMeasuredSize] = useState(false)

  // 同步监听窗口 resize，确保缩小/放大窗口时 store 更新、布局跟随。
  // 即使当前不是首页，也提前同步视口尺寸，这样从其它页面跳转回首页时不会用到默认视口导致导航位置不一致。
  useEffect(() => {
    const sync = () => setViewportSize(window.innerWidth, window.innerHeight)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [setViewportSize])

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
        setNavSize({ width: rect.width, height: rect.height })
        setHasMeasuredSize(true)
      }
    }
  }, [config.customSize, visibleNavItems.length, isHomepage])

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
  const baseSizeForPosition = config.customSize || navSize
  const navCanvasLeft = CANVAS_WIDTH / 2 + position.x - baseSizeForPosition.width / 2
  const navCanvasTop = CANVAS_HEIGHT / 2 + position.y - baseSizeForPosition.height / 2
  const homeLeft = translateX + navCanvasLeft * scale + dragDelta.x + (isResizing ? resizePositionDelta.x : 0)
  const homeTop = translateY + navCanvasTop * scale + dragDelta.y + (isResizing ? resizePositionDelta.y : 0)

  const useFixedSize = Boolean(config.customSize) || isResizing
  const displaySize = useFixedSize ? currentSize : undefined
  const isReady =
    (!isHomepage || hasRealViewport) &&
    (config.customSize ? true : hasMeasuredSize || !isHomepage)

  const targetX = isHomepage ? homeLeft : 20
  const targetY = isHomepage ? homeTop : 20
  const highlightedIndex =
    hoverIndex ?? visibleNavItems.findIndex((item) => item.href === pathname)
  const animateShell = isReady && !isDragging && !isResizing

  return (
    <motion.nav
      ref={navRef}
      layout={animateShell}
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
        'fixed left-0 top-0 z-50 group',
        'rounded-2xl bg-surface-glass backdrop-blur-lg',
        'border border-line-glass',
        '[box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1)]',
        isEditMode && 'cursor-grab active:cursor-grabbing ring-2 ring-accent-primary/50',
        isDragging && 'opacity-80'
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
      }}
      onPointerDown={isEditMode ? dragHandlers.onPointerDown : undefined}
      onMouseLeave={handleMouseLeave}
    >
      {isEditMode && <NavToolbar isHomepage={isHomepage} />}

      <motion.div
        layout={animateShell}
        transition={NAV_LAYOUT_SPRING}
        className={cn(
          'flex shrink-0 items-center',
          isHomepage ? 'mb-2 flex-col gap-2 border-b border-line-glass pb-3' : 'border-r border-line-glass pr-1'
        )}
      >
        <motion.div layout={animateShell} transition={NAV_LAYOUT_SPRING}>
          <Image
            src={avatarSrc}
            alt="Kenanyah"
            width={48}
            height={48}
            className={cn('rounded-full', isHomepage ? '' : 'mr-2')}
          />
        </motion.div>

        <AnimatePresence initial={false}>
          {isHomepage ? (
            <motion.span
              key="nav-name"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={NAV_TEXT_TRANSITION}
              className="text-sm font-medium text-content-primary"
            >
              Kenanyah
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <motion.div
        layout={animateShell}
        transition={NAV_LAYOUT_SPRING}
        data-nav-items
        className={cn(
          'relative flex min-w-0 flex-1 overflow-hidden',
          isHomepage ? 'min-w-30 flex-col justify-center gap-1' : 'flex-row items-center gap-0'
        )}
      >
        {visibleNavItems.map((item, index) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={pathname === item.href}
            isHighlighted={highlightedIndex === index}
            isCompact={!isHomepage}
            onMouseEnter={() => handleMouseEnter(index)}
          />
        ))}
      </motion.div>

      {isEditMode && <ResizeHandles onResizeStart={handleResizeStart} />}
    </motion.nav>
  )
}
