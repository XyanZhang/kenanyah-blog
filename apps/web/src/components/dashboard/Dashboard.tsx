'use client'

import { useCallback, useEffect, useRef } from 'react'
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
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants/dashboard'
import { getHomeConfig, putHomeConfig } from '@/lib/home-api'
import { DashboardCard } from './DashboardCard'
import { EditModeToggle } from './EditModeToggle'
import { AddCardDialog, AddCardDialogHandle } from './AddCardButton'
import { LayoutTemplatePickerDialog, LayoutTemplatePickerHandle } from './LayoutTemplatePicker'

export function Dashboard() {
  const {
    layout,
    isLoading,
    initializeLayout,
    updateCardPosition,
    setLayout,
  } = useDashboard()
  const { setActiveElement } = useAlignmentStore()
  const { scale, setViewportSize, translateX, translateY, setScale } = useHomeCanvasStore()
  const { config: navConfig, setConfigFromApi } = useNavStore()
  const viewportRef = useRef<HTMLDivElement>(null)
  const hasFetchedCloudRef = useRef(false)

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
    })
  }, [navConfig, scale])

  // 进入首页后从云端拉取配置并覆盖本地（若存在）
  useEffect(() => {
    if (isLoading || hasFetchedCloudRef.current) return
    hasFetchedCloudRef.current = true
    getHomeConfig()
      .then((data) => {
        if (!data) return
        setLayout(data.layout)
        setConfigFromApi(data.nav)
        if (data.canvas?.scale != null) setScale(data.canvas.scale)
      })
      .catch(() => {
        // 无配置或网络错误，保持本地/默认
      })
  }, [isLoading, setLayout, setConfigFromApi, setScale])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    initializeLayout()
  }, [initializeLayout])

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

  const handleDragEnd = (event: DragEndEvent) => {
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
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-content-muted">Loading dashboard...</div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-content-muted">No layout found</div>
      </div>
    )
  }

  const visibleCards = layout.cards.filter((card) => card.visible)

  // Sort cards by animationPriority for staggered animation
  const sortedCardsForAnimation = [...visibleCards].sort((a, b) => {
    const priorityA = a.animationPriority ?? Infinity
    const priorityB = b.animationPriority ?? Infinity
    return priorityA - priorityB
  })

  // Create a map of card id to animation index
  const animationIndexMap = new Map(
    sortedCardsForAnimation.map((card, index) => [card.id, index])
  )

  return (
    <div
      ref={viewportRef}
      className="relative h-screen w-full overflow-hidden"
      style={{ background: 'var(--theme-bg-base)' }}
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
      <div
        className="absolute left-0 top-0"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <div className="relative w-full h-full" style={{ position: 'relative' }}>
            {visibleCards.map((card) => (
              <DashboardCard
                key={card.id}
                card={card}
                animationIndex={animationIndexMap.get(card.id) ?? 0}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <EditModeToggle
        onAddCard={handleAddCard}
        onSelectLayout={handleSelectLayout}
        onSyncToCloud={handleSyncToCloud}
      />
      <AddCardDialog ref={addCardDialogRef} />
      <LayoutTemplatePickerDialog ref={layoutPickerDialogRef} />
    </div>
  )
}
