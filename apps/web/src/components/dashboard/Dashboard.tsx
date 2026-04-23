'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDashboard } from '@/hooks/useDashboard'
import { useDashboardStore } from '@/store/dashboard-store'
import { useAlignmentStore } from '@/store/alignment-store'
import { useHomeCanvasStore } from '@/store/home-canvas-store'
import { useNavStore } from '@/store/nav-store'
import { useThemeStore } from '@/store/theme-store'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MOBILE_LAYOUT_BOTTOM_PADDING,
  MOBILE_LAYOUT_BREAKPOINT,
  MOBILE_LAYOUT_GAP,
  MOBILE_LAYOUT_SIDE_PADDING,
  MOBILE_LAYOUT_TOP_PADDING,
} from '@/lib/constants/dashboard'
import { getHomeConfig, putHomeConfig, syncHomeConfigToStatic } from '@/lib/home-api'
import {
  getDesktopResolvedCardLayout,
  getStackedResolvedCardLayouts,
  type DashboardLayoutMode,
} from '@/lib/dashboard/responsive-layout'
import { DashboardCard } from './DashboardCard'
import { EditModeToggle } from './EditModeToggle'
import { AddCardDialog, AddCardDialogHandle } from './AddCardButton'
import { LayoutTemplatePickerDialog, LayoutTemplatePickerHandle } from './LayoutTemplatePicker'
import { DashboardBootLoading } from './DashboardBootLoading'

export function Dashboard() {
  const {
    layout,
    isLoading,
    initializeLayout,
    isEditMode,
    toggleEditMode,
    updateCardPosition,
    setLayout,
  } = useDashboard()
  const { setActiveElement } = useAlignmentStore()
  const {
    scale,
    setViewportSize,
    translateX,
    translateY,
    setScale,
    viewportWidth,
  } = useHomeCanvasStore()
  const { config: navConfig, setConfigFromApi } = useNavStore()
  const applyThemeConfig = useThemeStore((state) => state.applyThemeConfig)
  const viewportRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)

  // Dialog refs
  const addCardDialogRef = useRef<AddCardDialogHandle>(null)
  const layoutPickerDialogRef = useRef<LayoutTemplatePickerHandle>(null)

  // Dialog handlers
  const handleAddCard = useCallback(() => {
    addCardDialogRef.current?.open()
  }, [])

  const handleSelectLayout = useCallback(() => {
    layoutPickerDialogRef.current?.open()
  }, [])

  const handleSyncToCloud = useCallback(async () => {
    const currentLayout = useDashboardStore.getState().layout
    if (!currentLayout) return
    await putHomeConfig({
      layout: currentLayout,
      nav: navConfig,
      canvas: { scale },
      theme: useThemeStore.getState().getThemeConfig(),
    })
  }, [navConfig, scale])

  const handleSyncToStatic = useCallback(async () => {
    const currentLayout = useDashboardStore.getState().layout
    if (!currentLayout) return
    await syncHomeConfigToStatic({
      layout: currentLayout,
      nav: navConfig,
      canvas: { scale },
      theme: useThemeStore.getState().getThemeConfig(),
    })
  }, [navConfig, scale])

  // 初始化：优先渲染本地布局，远端配置在后台同步，避免首页首屏被网络阻塞
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    let isActive = true
    initializeLayout()

    getHomeConfig()
      .then((data) => {
        if (!isActive) return

        if (data) {
          setLayout(data.layout)
          setConfigFromApi(data.nav)
          if (data.canvas?.scale != null) setScale(data.canvas.scale)
          if (data.theme) applyThemeConfig(data.theme)
        }
      })
      .catch(() => {
        // 网络慢或后端不可用时，保持本地布局即可
      })

    return () => {
      isActive = false
    }
  }, [applyThemeConfig, initializeLayout, setConfigFromApi, setLayout, setScale])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // 同步视口尺寸到 home canvas store，窗口缩放/resize 时更新平移使画布居中对齐
  useEffect(() => {
    const syncSize = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1920
      const h = typeof window !== 'undefined' ? window.innerHeight : 1080
      setViewportSize(w, h)
    }
    const el = viewportRef.current
    if (el) {
      syncSize()
      const ro = new ResizeObserver(syncSize)
      ro.observe(el)
      const onResize = () => syncSize()
      window.addEventListener('resize', onResize)
      return () => {
        ro.disconnect()
        window.removeEventListener('resize', onResize)
      }
    }
    syncSize()
  }, [setViewportSize])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event

    if (delta.x !== 0 || delta.y !== 0) {
      const currentSnapOffset = useAlignmentStore.getState().snapOffset
      const finalViewportDelta = {
        x: delta.x + (currentSnapOffset?.x ?? 0),
        y: delta.y + (currentSnapOffset?.y ?? 0),
      }
      // 视口像素 → 画布坐标（除以 scale）
      const canvasDelta = {
        x: finalViewportDelta.x / scale,
        y: finalViewportDelta.y / scale,
      }
      updateCardPosition(active.id as string, canvasDelta)
    }

    setActiveElement(null)
  }, [scale, updateCardPosition, setActiveElement])

  const cards = layout?.cards ?? []

  const layoutMode: DashboardLayoutMode =
    viewportWidth <= MOBILE_LAYOUT_BREAKPOINT ? 'mobile' : 'desktop'
  const isStackedLayout = layoutMode !== 'desktop'
  const visibleCards = useMemo(
    () =>
      cards.filter((card) => {
        if (!card.visible) return false
        if (layoutMode === 'mobile' && card.mobileVisible === false) return false
        return true
      }),
    [cards, layoutMode]
  )

  useEffect(() => {
    if (isStackedLayout && isEditMode) {
      toggleEditMode()
    }
  }, [isEditMode, isStackedLayout, toggleEditMode])

  const stackedContainerWidth = useMemo(() => {
    const availableWidth = Math.max(0, viewportWidth - MOBILE_LAYOUT_SIDE_PADDING * 2)
    return availableWidth
  }, [layoutMode, viewportWidth])

  const stackedContainerX = useMemo(
    () => Math.max(MOBILE_LAYOUT_SIDE_PADDING, (viewportWidth - stackedContainerWidth) / 2),
    [stackedContainerWidth, viewportWidth]
  )

  const resolvedCardLayouts = useMemo(() => {
    if (layoutMode !== 'desktop') {
      return getStackedResolvedCardLayouts(visibleCards, stackedContainerWidth, MOBILE_LAYOUT_GAP)
    }

    return {
      layouts: new Map(visibleCards.map((card) => [card.id, getDesktopResolvedCardLayout(card)])),
      contentHeight: CANVAS_HEIGHT,
      contentWidth: CANVAS_WIDTH,
    }
  }, [layoutMode, stackedContainerWidth, visibleCards])

  // Sort cards by animationPriority for staggered animation
  const sortedCardsForAnimation = useMemo(
    () =>
      [...visibleCards].sort((a, b) => {
        const priorityA = a.animationPriority ?? Infinity
        const priorityB = b.animationPriority ?? Infinity
        return priorityA - priorityB
      }),
    [visibleCards]
  )

  // Create a map of card id to animation index
  const animationIndexMap = useMemo(
    () => new Map(sortedCardsForAnimation.map((card, index) => [card.id, index])),
    [sortedCardsForAnimation]
  )

  const canvasFrame = useMemo(() => {
    if (layoutMode !== 'desktop') {
      return {
        x: stackedContainerX,
        y: MOBILE_LAYOUT_TOP_PADDING,
        width: resolvedCardLayouts.contentWidth,
        height: resolvedCardLayouts.contentHeight,
        scale: 1,
      }
    }

    return {
      x: translateX,
      y: translateY,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      scale,
    }
  }, [
    layoutMode,
    resolvedCardLayouts.contentHeight,
    resolvedCardLayouts.contentWidth,
    scale,
    stackedContainerX,
    translateX,
    translateY,
  ])

  const viewportMinHeight = isStackedLayout
    ? resolvedCardLayouts.contentHeight + MOBILE_LAYOUT_TOP_PADDING + MOBILE_LAYOUT_BOTTOM_PADDING
    : '100vh'

  if (isLoading && !layout) {
    return (
      <DashboardBootLoading />
    )
  }

  if (!layout) {
    return (
      <div className="relative h-screen w-full">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-lg text-content-muted">暂无布局，点击右下角「插入组件」添加第一个组件</div>
        </div>
        <EditModeToggle
          onAddCard={handleAddCard}
          onSelectLayout={handleSelectLayout}
          onSyncToCloud={handleSyncToCloud}
          onSyncToStatic={handleSyncToStatic}
        />
        <AddCardDialog ref={addCardDialogRef} />
        <LayoutTemplatePickerDialog ref={layoutPickerDialogRef} />
      </div>
    )
  }

  return (
    <div
      ref={viewportRef}
      className={`relative w-full overflow-x-hidden ${isStackedLayout ? 'overflow-y-auto' : 'h-screen overflow-hidden'}`}
      style={{ minHeight: viewportMinHeight, background: 'var(--theme-bg-base)' }}
    >
      {/* Nightscape bokeh light orbs with floating animation */}
      <div className="bokeh-orb bokeh-orb-1 absolute top-[8%] left-[12%] h-72 w-72 rounded-full opacity-70 blur-3xl" style={{ background: 'var(--theme-bg-orb-1)' }} />
      <div className="bokeh-orb bokeh-orb-2 absolute top-[15%] right-[8%] h-96 w-96 rounded-full opacity-60 blur-3xl" style={{ background: 'var(--theme-bg-orb-2)' }} />
      <div className="bokeh-orb bokeh-orb-3 absolute bottom-[20%] left-[5%] h-80 w-80 rounded-full opacity-50 blur-3xl" style={{ background: 'var(--theme-bg-orb-3)' }} />
      <div className="bokeh-orb bokeh-orb-4 absolute bottom-[10%] right-[15%] h-64 w-64 rounded-full opacity-65 blur-3xl" style={{ background: 'var(--theme-bg-orb-4)' }} />
      <div className="bokeh-orb bokeh-orb-5 absolute top-[45%] left-[35%] h-56 w-56 rounded-full opacity-40 blur-3xl" style={{ background: 'var(--theme-bg-orb-5)' }} />
      <div className="bokeh-orb bokeh-orb-6 absolute top-[5%] left-[55%] h-48 w-48 rounded-full opacity-55 blur-3xl" style={{ background: 'var(--theme-bg-orb-6)' }} />
      <div className="bokeh-orb bokeh-orb-7 absolute bottom-[35%] right-[30%] h-40 w-40 rounded-full opacity-45 blur-2xl" style={{ background: 'var(--theme-bg-orb-7)' }} />
      <div className="bokeh-orb bokeh-orb-8 absolute top-[60%] left-[65%] h-36 w-36 rounded-full opacity-50 blur-2xl" style={{ background: 'var(--theme-bg-orb-8)' }} />

      {/* 画布外容器：transform 使缩放时居中对齐，左上角为坐标原点 */}
      <motion.div
        className="absolute left-0 top-0"
        initial={false}
        animate={{
          x: canvasFrame.x,
          y: canvasFrame.y,
          scale: canvasFrame.scale,
          width: canvasFrame.width,
          height: canvasFrame.height,
        }}
        transition={{
          x: { type: 'spring', stiffness: 340, damping: 32, mass: 0.82 },
          y: { type: 'spring', stiffness: 340, damping: 32, mass: 0.82 },
          scale: { type: 'spring', stiffness: 300, damping: 30, mass: 0.85 },
          width: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
          height: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
        }}
        style={{
          transformOrigin: '0 0',
        }}
      >
        <DndContext
          sensors={sensors}
          onDragEnd={isStackedLayout ? undefined : handleDragEnd}
        >
          <div className="relative w-full h-full" style={{ position: 'relative' }}>
            {visibleCards.map((card) => (
              <DashboardCard
                key={card.id}
                card={card}
                layoutMode={layoutMode}
                animationIndex={animationIndexMap.get(card.id) ?? 0}
                resolvedLayout={resolvedCardLayouts.layouts.get(card.id) ?? getDesktopResolvedCardLayout(card)}
              />
            ))}
          </div>
        </DndContext>
      </motion.div>

      {layoutMode === 'desktop' && (
        <EditModeToggle
          onAddCard={handleAddCard}
          onSelectLayout={handleSelectLayout}
          onSyncToCloud={handleSyncToCloud}
          onSyncToStatic={handleSyncToStatic}
        />
      )}
      <AddCardDialog ref={addCardDialogRef} />
      <LayoutTemplatePickerDialog ref={layoutPickerDialogRef} />
    </div>
  )
}
