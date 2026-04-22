'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/hooks/useDashboard'
import { useDashboardStore } from '@/store/dashboard-store'
import { useNavStore } from '@/store/nav-store'
import { useAlignmentStore } from '@/store/alignment-store'
import { useHomeCanvasStore } from '@/store/home-canvas-store'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MOBILE_LAYOUT_BREAKPOINT,
} from '@/lib/constants/dashboard'
import { useAlignmentRegistration } from '@/hooks/useAlignmentRegistration'
import { useDrag } from '@/hooks/useDrag'
import { useResize } from '@/hooks/useResize'
import type { NavItem as NavItemType } from './nav-items'
import { NavToolbar } from './NavToolbar'
import { ResizeHandles } from '@/components/dashboard/ResizeHandles'
import { NavShell } from './NavShell'
import { NavContent } from './NavContent'
import { getInnerNavMode } from './nav-layout'

const NAV_ELEMENT_ID = 'nav-component'
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
const DESKTOP_RAIL_OFFSET = { x: 20, y: 28 }
const MOBILE_BAR_TOP = 12

function useProfileAvatarFromLayout(): string | null {
  const layout = useDashboardStore((s) => s.layout)
  const profileCard = layout?.cards?.find((c) => c.type === 'profile')
  const avatar = profileCard?.config?.avatar
  return typeof avatar === 'string' && avatar.trim() ? avatar.trim() : null
}

export function Nav() {
  const pathname = usePathname()
  const { isEditMode, isLoading } = useDashboard()
  const { config, updatePosition, updateSize, setResizing, hasHydrated } = useNavStore()
  const avatarSrc = useProfileAvatarFromLayout()

  const isHomepage = pathname === '/'
  const innerNavMode = getInnerNavMode(pathname)
  const isImmersiveRoute = innerNavMode === 'immersive'
  const {
    scale,
    translateX,
    translateY,
    setViewportSize,
    hasRealViewport,
    viewportWidth,
  } = useHomeCanvasStore()
  const navRef = useRef<HTMLElement>(null)
  const contentModeTimerRef = useRef<number | null>(null)
  const previousTargetLayoutModeRef = useRef<'home' | 'rail' | 'topbar'>('home')
  const [layoutMode, setLayoutMode] = useState<'home' | 'rail' | 'topbar'>('home')
  const [measuredSizes, setMeasuredSizes] = useState({
    home: { width: 200, height: 60 },
    rail: { width: 72, height: 460 },
    topbar: { width: 240, height: 64 },
  })
  const [hasMeasuredHomeSize, setHasMeasuredHomeSize] = useState(false)
  const [hasMeasuredRailSize, setHasMeasuredRailSize] = useState(false)
  const [hasMeasuredTopbarSize, setHasMeasuredTopbarSize] = useState(false)

  useEffect(() => {
    const sync = () => setViewportSize(window.innerWidth, window.innerHeight)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [setViewportSize])

  const isMobileViewport = viewportWidth <= MOBILE_LAYOUT_BREAKPOINT
  const targetLayoutMode = isHomepage ? 'home' : isMobileViewport ? 'topbar' : 'rail'

  useEffect(() => {
    const previousTargetLayoutMode = previousTargetLayoutModeRef.current
    previousTargetLayoutModeRef.current = targetLayoutMode

    if (contentModeTimerRef.current !== null) {
      clearTimeout(contentModeTimerRef.current)
      contentModeTimerRef.current = null
    }

    if (previousTargetLayoutMode === targetLayoutMode) {
      setLayoutMode(targetLayoutMode)
      return
    }

    contentModeTimerRef.current = window.setTimeout(() => {
      setLayoutMode(targetLayoutMode)
      contentModeTimerRef.current = null
    }, NAV_CONTENT_SWAP_DELAY_MS)

    return () => {
      if (contentModeTimerRef.current !== null) {
        clearTimeout(contentModeTimerRef.current)
        contentModeTimerRef.current = null
      }
    }
  }, [targetLayoutMode])

  const isTopRowHomepage = isHomepage && isMobileViewport
  const visualLayoutMode: 'home' | 'rail' | 'topbar' = isTopRowHomepage ? 'topbar' : layoutMode

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
    if (!navRef.current) return

    const shouldUseMeasuredSize = isHomepage ? !config.customSize : true
    if (!shouldUseMeasuredSize) return

    const rect = navRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const nextSize = { width: rect.width, height: rect.height }
    setMeasuredSizes((current) => {
      const currentSize = current[visualLayoutMode]
      if (
        Math.abs(currentSize.width - nextSize.width) < 0.5 &&
        Math.abs(currentSize.height - nextSize.height) < 0.5
      ) {
        return current
      }

      return {
        ...current,
        [visualLayoutMode]: nextSize,
      }
    })

    if (visualLayoutMode === 'home') {
      setHasMeasuredHomeSize(true)
    } else if (visualLayoutMode === 'rail') {
      setHasMeasuredRailSize(true)
    } else {
      setHasMeasuredTopbarSize(true)
    }
  }, [config.customSize, isHomepage, visibleNavItems.length, visualLayoutMode, viewportWidth])

  const { isDragging, dragDelta, dragHandlers } = useDrag({
    onDragEnd: (delta) => {
      if (!isHomepage) return

      const currentSnapOffset = useAlignmentStore.getState().snapOffset
      const finalViewportDelta = {
        x: delta.x + (currentSnapOffset?.x ?? 0),
        y: delta.y + (currentSnapOffset?.y ?? 0),
      }
      updatePosition({
        x: finalViewportDelta.x / scale,
        y: finalViewportDelta.y / scale,
      })
    },
    disabled: !isEditMode || !isHomepage,
  })

  const baseSize =
    isHomepage && config.customSize ? config.customSize : measuredSizes[visualLayoutMode]
  const {
    isResizing,
    currentSize,
    positionDelta: resizePositionDelta,
    handleResizeStart,
  } = useResize({
    initialSize: baseSize,
    constraints: { minWidth: 60, minHeight: 60, maxWidth: 600, maxHeight: 600 },
    onResizeEnd: (size, positionDelta) => {
      if (!isHomepage) return

      updateSize(size)
      if (positionDelta.x !== 0 || positionDelta.y !== 0) {
        updatePosition({
          x: positionDelta.x / scale,
          y: positionDelta.y / scale,
        })
      }
      setResizing(false)
    },
  })

  useEffect(() => {
    if (isHomepage && isResizing) {
      setResizing(true)
    }
  }, [isHomepage, isResizing, setResizing])

  useAlignmentRegistration({
    id: NAV_ELEMENT_ID,
    ref: navRef,
    isEditMode: isEditMode && isHomepage,
    isDragging,
    isResizing: isHomepage && isResizing,
  })

  const position = config.homePosition
  const baseSizeForPosition = isHomepage && config.customSize ? config.customSize : measuredSizes.home
  const navCanvasLeft = CANVAS_WIDTH / 2 + position.x - baseSizeForPosition.width / 2
  const navCanvasTop = CANVAS_HEIGHT / 2 + position.y - baseSizeForPosition.height / 2
  const homeLeft =
    translateX + navCanvasLeft * scale + dragDelta.x + (isResizing ? resizePositionDelta.x : 0)
  const homeTop =
    translateY + navCanvasTop * scale + dragDelta.y + (isResizing ? resizePositionDelta.y : 0)

  const useFixedSize = isHomepage && (Boolean(config.customSize) || isResizing)
  const displaySize = useFixedSize ? currentSize : undefined
  const hasMeasuredTargetSize =
    targetLayoutMode === 'home'
      ? hasMeasuredHomeSize
      : targetLayoutMode === 'rail'
        ? hasMeasuredRailSize
        : hasMeasuredTopbarSize
  const shouldWaitForHomeBootstrap = isHomepage && isLoading
  const isReady =
    hasHydrated &&
    !shouldWaitForHomeBootstrap &&
    (!isHomepage || hasRealViewport) &&
    (isHomepage && config.customSize ? true : hasMeasuredTargetSize || !isHomepage)

  const rowNavWidth = Math.max(0, viewportWidth - 24)
  const targetSize = measuredSizes[targetLayoutMode]
  const targetX = isHomepage
    ? homeLeft
    : targetLayoutMode === 'topbar'
      ? Math.max(12, (viewportWidth - targetSize.width) / 2)
      : DESKTOP_RAIL_OFFSET.x
  const targetY =
    isHomepage ? homeTop : targetLayoutMode === 'topbar' ? MOBILE_BAR_TOP : DESKTOP_RAIL_OFFSET.y
  const animateShell = isReady && !isDragging && !isResizing
  const shellX = isTopRowHomepage ? 0 : targetX
  const shellY = isTopRowHomepage ? 0 : targetY
  const isHomeVisual = visualLayoutMode === 'home'

  return (
    <NavShell
      shellClassName={cn(
        visualLayoutMode === 'topbar'
          ? 'fixed left-0 top-0 z-50 flex w-full justify-center px-3 pt-3'
          : 'fixed left-0 top-0 z-50'
      )}
      shellX={shellX}
      shellY={shellY}
      isReady={isReady}
      isDragging={isDragging}
      animateShell={animateShell}
      transition={{
        layout: NAV_LAYOUT_SPRING,
        x: animateShell ? NAV_SHELL_SPRING : NAV_IMMEDIATE_TRANSITION,
        y: animateShell ? NAV_SHELL_SPRING : NAV_IMMEDIATE_TRANSITION,
        opacity: NAV_TEXT_TRANSITION,
        scale: isDragging ? NAV_SHELL_SPRING : NAV_TEXT_TRANSITION,
      }}
      navClassName={cn(
        isHomepage && isEditMode && 'cursor-grab active:cursor-grabbing ring-2 ring-accent-primary/50',
        isDragging && 'opacity-80',
        isImmersiveRoute && !isHomepage && 'bg-surface-glass/85'
      )}
      navStyle={{
        display: 'flex',
        flexDirection: visualLayoutMode === 'topbar' ? 'row' : 'column',
        alignItems: visualLayoutMode === 'home' ? undefined : 'center',
        gap: '4px',
        padding:
          visualLayoutMode === 'topbar'
            ? '8px 12px'
            : isHomeVisual
              ? '12px'
              : '12px 10px',
        width:
          visualLayoutMode === 'topbar'
            ? rowNavWidth
            : isHomeVisual
              ? displaySize?.width
              : 72,
        maxWidth: visualLayoutMode === 'topbar' ? 720 : undefined,
        height: isHomeVisual ? displaySize?.height : undefined,
        minWidth: isHomeVisual ? undefined : 72,
        minHeight: 48,
        overflow: useFixedSize && !isEditMode ? 'hidden' : 'visible',
        willChange: animateShell ? 'width, height' : undefined,
        backfaceVisibility: 'hidden',
      }}
      navRef={navRef}
      onPointerDown={isHomepage && isEditMode ? dragHandlers.onPointerDown : undefined}
    >
      {isHomepage && isEditMode ? <NavToolbar isHomepage /> : null}

      <NavContent
        avatarSrc={avatarSrc}
        items={visibleNavItems}
        pathname={pathname}
        layoutMode={visualLayoutMode}
        isEditMode={isEditMode}
        onItemHover={() => undefined}
        onMouseLeave={() => undefined}
      />

      {isHomepage && isEditMode && isHomeVisual ? <ResizeHandles onResizeStart={handleResizeStart} /> : null}
    </NavShell>
  )
}
