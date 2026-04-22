'use client'

import { useCallback, useMemo, useState, useRef, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { DashboardCard as DashboardCardType, CardType, CardDimensions, CardSize } from '@blog/types'
import { useDashboard } from '@/hooks/useDashboard'
import { useCardResize } from '@/hooks/useCardResize'
import { useAlignmentRegistration } from '@/hooks/useAlignmentRegistration'
import { useHomeCanvasStore } from '@/store/home-canvas-store'
import { getCardDimensions, DEFAULT_BORDER_RADIUS } from '@/lib/constants/dashboard'
import type { DashboardLayoutMode, ResolvedCardLayout } from '@/lib/dashboard/responsive-layout'
import { CardToolbar } from './CardToolbar'
import { CardConfigDialog } from './CardConfigDialog'
import { ResizeHandles } from './ResizeHandles'
import { CardLoadingState } from './cards/CardLoadingState'

const cardComponents = {
  [CardType.PROFILE]: lazy(() => import('./cards/ProfileCard').then(m => ({ default: m.ProfileCard }))),
  [CardType.STATS]: lazy(() => import('./cards/StatsCard').then(m => ({ default: m.StatsCard }))),
  [CardType.CATEGORIES]: lazy(() => import('./cards/CategoriesCard').then(m => ({ default: m.CategoriesCard }))),
  [CardType.RECENT_POSTS]: lazy(() => import('./cards/RecentPostsCard').then(m => ({ default: m.RecentPostsCard }))),
  [CardType.TABBAR]: lazy(() => import('./cards/TabbarCard').then(m => ({ default: m.TabbarCard }))),
  [CardType.LATEST_POSTS]: lazy(() => import('./cards/LatestPostsCard').then(m => ({ default: m.LatestPostsCard }))),
  [CardType.RANDOM_POSTS]: lazy(() => import('./cards/RandomPostsCard').then(m => ({ default: m.RandomPostsCard }))),
  [CardType.CALENDAR]: lazy(() => import('./cards/CalendarCard').then(m => ({ default: m.CalendarCard }))),
  [CardType.CLOCK]: lazy(() => import('./cards/ClockCard').then(m => ({ default: m.ClockCard }))),
  [CardType.IMAGE]: lazy(() => import('./cards/ImageCard').then(m => ({ default: m.ImageCard }))),
  [CardType.SOCIAL]: lazy(() => import('./cards/SocialCard').then(m => ({ default: m.SocialCard }))),
  [CardType.MOTTO]: lazy(() => import('./cards/MottoCard').then(m => ({ default: m.MottoCard }))),
  [CardType.WEATHER]: lazy(() => import('./cards/WeatherCard').then(m => ({ default: m.WeatherCard }))),
  [CardType.MUSIC]: lazy(() => import('./cards/MusicCard').then(m => ({ default: m.MusicCard }))),
  [CardType.READING]: lazy(() => import('./cards/ReadingCard').then(m => ({ default: m.ReadingCard }))),
  [CardType.WOODEN_FISH]: lazy(() => import('./cards/WoodenFishCard').then(m => ({ default: m.WoodenFishCard }))),
  [CardType.AI_CHAT]: lazy(() => import('./cards/AiChatCard').then(m => ({ default: m.AiChatCard }))),
  [CardType.COUNTDOWN]: lazy(() => import('./cards/CountdownCard').then(m => ({ default: m.CountdownCard }))),
}

const CARD_HOVER_SCALE = 1.052
const CARD_SUBTLE_HOVER_SCALE = 1.036
const CARD_HOVER_LIFT = 7
const CARD_SUBTLE_HOVER_LIFT = 4
const CARD_HOVER_SHADOW =
  '0 26px 52px -20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.78)'

const CARD_POSITION_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 28,
  mass: 0.72,
}

const CARD_INTERACTION_TRANSITION = {
  duration: 0,
}

const CARD_SIZE_SPRING = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 30,
  mass: 0.9,
}

const CARD_ENTRANCE_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 26,
  mass: 0.7,
}

const CARD_HOVER_TRANSITION = {
  type: 'spring' as const,
  stiffness: 700,
  damping: 26,
  mass: 0.52,
}

const CARD_DRAG_ACTIVATOR_INSET = 16

function CardPlaceholder() {
  return (
    <CardLoadingState spinnerSize="sm" className="min-h-[140px]" />
  )
}

interface DashboardCardProps {
  card: DashboardCardType
  animationIndex: number
  layoutMode: DashboardLayoutMode
  resolvedLayout: ResolvedCardLayout
}

export function DashboardCard({ card, animationIndex, layoutMode, resolvedLayout }: DashboardCardProps) {
  const router = useRouter()
  const { isEditMode, selectedCardId, selectCard, updateCardSize, layout } = useDashboard()
  const [openConfigCardId, setOpenConfigCardId] = useState<string | null>(null)
  const configCard = layout?.cards.find((c) => c.id === openConfigCardId)
  const baseDimensions = getCardDimensions(card.size, card.customDimensions)
  const isAutoSize = card.size === CardSize.AUTO
  const isSelected = selectedCardId === card.id
  const isDesktopLayout = layoutMode === 'desktop'
  const canEditCard = isDesktopLayout && isEditMode

  const navigateTo = card.config?.navigateTo as string | undefined

  const handleCardClick = useCallback(() => {
    if (canEditCard) {
      selectCard(card.id)
      return
    }
    if (navigateTo) {
      router.push(navigateTo as Route)
    }
  }, [canEditCard, selectCard, navigateTo, router, card.id])

  // Ref to the card element for measuring bounds
  const cardRef = useRef<HTMLDivElement>(null)

  // Track if initial animation has completed
  const [hasAnimated, setHasAnimated] = useState(false)

  const scale = useHomeCanvasStore((s) => s.scale)
  const handleResizeEnd = useCallback(
    (dimensions: CardDimensions, positionDelta: { x: number; y: number }) => {
      const canvasDelta = {
        x: positionDelta.x / scale,
        y: positionDelta.y / scale,
      }
      updateCardSize(card.id, dimensions, canvasDelta)
    },
    [card.id, updateCardSize, scale]
  )

  const { isResizing, currentDimensions, positionDelta, handleResizeStart } = useCardResize({
    initialDimensions: baseDimensions ?? { width: 200, height: 200 },
    onResizeEnd: handleResizeEnd,
  })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !canEditCard || isResizing,
  })

  // Combined ref for both dnd-kit and our measurement
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      ;(cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [setNodeRef]
  )

  // Register with alignment system for guides and snap
  useAlignmentRegistration({
    id: card.id,
    ref: cardRef,
    isEditMode: canEditCard,
    isDragging,
    isResizing,
  })

  const CardContent = cardComponents[card.type] as React.ComponentType<
    { card: DashboardCardType; onOpenConfig?: () => void }
  >
  const borderRadius = card.borderRadius ?? DEFAULT_BORDER_RADIUS
  const handleOpenConfig = useCallback(() => setOpenConfigCardId(card.id), [card.id])
  const padding = card.padding ?? 24
  const hideCardContainer = card.config?.hideCardContainer ?? false
  const hoverScale = navigateTo ? CARD_HOVER_SCALE : CARD_SUBTLE_HOVER_SCALE
  const hoverLift = navigateTo ? CARD_HOVER_LIFT : CARD_SUBTLE_HOVER_LIFT
  const isInteracting = canEditCard && (isDragging || isResizing)
  const liveWidth = isResizing
    ? currentDimensions.width
    : (resolvedLayout.width ?? currentDimensions.width)
  const liveHeight = isResizing
    ? currentDimensions.height
    : (resolvedLayout.height ?? currentDimensions.height)

  const cardContent = useMemo(
    () => (
      <Suspense fallback={<CardPlaceholder />}>
        <CardContent
          card={card}
          onOpenConfig={canEditCard ? handleOpenConfig : undefined}
        />
      </Suspense>
    ),
    [CardContent, card, canEditCard, handleOpenConfig]
  )

  // 画布坐标：card.position 为画布坐标，transform 与 positionDelta 为视口像素需除以 scale
  const position = useMemo(
    () => ({
      x:
        resolvedLayout.x +
        (canEditCard ? (transform?.x ?? 0) / scale + positionDelta.x / scale : 0),
      y:
        resolvedLayout.y +
        (canEditCard ? (transform?.y ?? 0) / scale + positionDelta.y / scale : 0),
    }),
    [
      canEditCard,
      resolvedLayout.x,
      resolvedLayout.y,
      transform?.x,
      transform?.y,
      scale,
      positionDelta.x,
      positionDelta.y,
    ]
  )

  // Animation delay based on priority
  const animationDelay = animationIndex * 0.045

  return (
    <motion.div
      ref={combinedRef}
      style={{
        position: 'absolute',
        width: isAutoSize && resolvedLayout.width == null ? 'fit-content' : undefined,
        height: isAutoSize && resolvedLayout.height == null ? 'fit-content' : undefined,
        zIndex: isDragging || isResizing ? 1000 : resolvedLayout.zIndex,
        borderRadius: hideCardContainer ? 0 : borderRadius,
        padding: hideCardContainer ? 0 : padding,
        touchAction: canEditCard ? 'none' : undefined,
        userSelect: canEditCard ? 'none' : undefined,
        willChange: !canEditCard && !isDragging && !isResizing ? 'transform, width, height, opacity' : undefined,
      }}
      initial={{
        scale: 0.93,
        opacity: 0,
        x: position.x,
        y: position.y + 18,
        ...(isAutoSize
          ? {}
          : {
              width: liveWidth,
              height: liveHeight,
            }),
      }}
      animate={{
        x: position.x,
        y: position.y,
        scale: 1,
        opacity: isDragging ? 0.88 : 1,
        ...(isAutoSize
          ? {}
          : {
              width: liveWidth,
              height: liveHeight,
            }),
      }}
      transition={{
        x: isInteracting ? CARD_INTERACTION_TRANSITION : CARD_POSITION_SPRING,
        y: isInteracting ? CARD_INTERACTION_TRANSITION : CARD_POSITION_SPRING,
        width: isAutoSize || isInteracting ? CARD_INTERACTION_TRANSITION : CARD_SIZE_SPRING,
        height: isAutoSize || isInteracting ? CARD_INTERACTION_TRANSITION : CARD_SIZE_SPRING,
        scale: {
          ...CARD_ENTRANCE_SPRING,
          delay: hasAnimated ? 0 : animationDelay,
        },
        opacity: {
          ...CARD_ENTRANCE_SPRING,
          delay: hasAnimated ? 0 : animationDelay,
        },
      }}
      onAnimationComplete={() => {
        if (!hasAnimated) setHasAnimated(true)
      }}
      whileHover={
        !canEditCard && isDesktopLayout
          ? {
              scale: hoverScale,
              y: position.y - hoverLift,
              ...(hideCardContainer ? {} : { boxShadow: CARD_HOVER_SHADOW }),
              transition: CARD_HOVER_TRANSITION,
            }
          : undefined
      }
      className={`
        card group relative
        ${hideCardContainer ? '' : 'squircle bg-surface-glass border border-line-glass backdrop-blur-lg [box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.7)]'}
        ${isSelected ? 'ring-2 ring-line-focus' : ''}
        ${!hideCardContainer && isDragging ? '[box-shadow:0_30px_50px_-15px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.7)]' : ''}
        ${!canEditCard && navigateTo ? 'cursor-pointer' : ''}
      `}
      onClick={handleCardClick}
    >
      {canEditCard && !isResizing && (
        <div
          className="absolute z-10 rounded-[inherit] cursor-grab active:cursor-grabbing"
          style={{
            top: CARD_DRAG_ACTIVATOR_INSET,
            right: CARD_DRAG_ACTIVATOR_INSET,
            bottom: CARD_DRAG_ACTIVATOR_INSET,
            left: CARD_DRAG_ACTIVATOR_INSET,
          }}
          {...attributes}
          {...listeners}
        />
      )}

      <div
        className="h-full w-full overflow-hidden relative z-0"
        style={{ borderRadius: hideCardContainer ? 0 : `${Math.max(0, borderRadius - 24)}px` }}
      >
        {cardContent}
      </div>
      {canEditCard && (
        <div className="absolute right-2 top-2 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <CardToolbar cardId={card.id} onOpenConfig={handleOpenConfig} />
          </div>
        </div>
      )}
      {configCard && (
        <CardConfigDialog
          card={configCard}
          open={openConfigCardId !== null}
          onOpenChange={(open) => !open && setOpenConfigCardId(null)}
        />
      )}
      {canEditCard && !isAutoSize && <ResizeHandles onResizeStart={handleResizeStart} />}
    </motion.div>
  )
}
