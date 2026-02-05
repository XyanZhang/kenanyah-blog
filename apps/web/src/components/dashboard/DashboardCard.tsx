'use client'

import { useCallback, useState, useRef, lazy, Suspense } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { DashboardCard as DashboardCardType, CardType, CardDimensions, CardSize } from '@blog/types'
import { useDashboard } from '@/hooks/useDashboard'
import { useCardResize } from '@/hooks/useCardResize'
import { useAlignmentRegistration } from '@/hooks/useAlignmentRegistration'
import { getCardDimensions, DEFAULT_BORDER_RADIUS } from '@/lib/constants/dashboard'
import { CardToolbar } from './CardToolbar'
import { ResizeHandles } from './ResizeHandles'

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
}

function CardPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-primary border-t-transparent" />
    </div>
  )
}

interface DashboardCardProps {
  card: DashboardCardType
  animationIndex: number
}

export function DashboardCard({ card, animationIndex }: DashboardCardProps) {
  const { isEditMode, selectedCardId, selectCard, updateCardSize } = useDashboard()
  const baseDimensions = getCardDimensions(card.size, card.customDimensions)
  const isAutoSize = card.size === CardSize.AUTO
  const isSelected = selectedCardId === card.id

  // Ref to the card element for measuring bounds
  const cardRef = useRef<HTMLDivElement>(null)

  // Track if initial animation has completed
  const [hasAnimated, setHasAnimated] = useState(false)

  const handleResizeEnd = useCallback(
    (dimensions: CardDimensions, positionDelta: { x: number; y: number }) => {
      updateCardSize(card.id, dimensions, positionDelta)
    },
    [card.id, updateCardSize]
  )

  const { isResizing, currentDimensions, positionDelta, handleResizeStart } = useCardResize({
    initialDimensions: baseDimensions ?? { width: 200, height: 200 },
    onResizeEnd: handleResizeEnd,
  })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !isEditMode || isResizing,
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
    isEditMode,
    isDragging,
    isResizing,
  })

  const CardContent = cardComponents[card.type] as React.ComponentType<{ card: DashboardCardType }>
  const borderRadius = card.borderRadius ?? DEFAULT_BORDER_RADIUS

  // Calculate final position including drag transform and resize position delta
  const x = card.position.x + (transform?.x || 0) + positionDelta.x
  const y = card.position.y + (transform?.y || 0) + positionDelta.y

  // Animation delay based on priority
  const animationDelay = animationIndex * 0.15

  return (
    <motion.div
      ref={combinedRef}
      style={{
        position: 'absolute',
        width: isAutoSize ? 'fit-content' : currentDimensions.width,
        height: isAutoSize ? 'fit-content' : currentDimensions.height,
        zIndex: isDragging || isResizing ? 1000 : card.position.z,
        borderRadius: `${borderRadius}px`,
      }}
      initial={{ scale: 0, opacity: 0, x, y }}
      animate={{
        x,
        y,
        scale: 1,
        opacity: isDragging ? 0.8 : 1,
      }}
      transition={{
        x: { type: 'spring', stiffness: isDragging || isResizing ? 500 : 260, damping: isDragging || isResizing ? 30 : 20 },
        y: { type: 'spring', stiffness: isDragging || isResizing ? 500 : 260, damping: isDragging || isResizing ? 30 : 20 },
        scale: {
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: hasAnimated ? 0 : animationDelay,
        },
        opacity: {
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: hasAnimated ? 0 : animationDelay,
        },
      }}
      onAnimationComplete={() => {
        if (!hasAnimated) setHasAnimated(true)
      }}
      whileHover={!isEditMode ? { scale: 1.02 } : undefined}
      className={`
        group relative
        bg-surface-glass border border-line-glass p-6 backdrop-blur-lg
        [box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)]
        ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isSelected ? 'ring-2 ring-line-focus' : ''}
        ${isDragging ? '[box-shadow:0_30px_50px_-15px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]' : ''}
      `}
      onClick={() => isEditMode && selectCard(card.id)}
      {...(isEditMode && !isResizing ? { ...attributes, ...listeners } : {})}
    >
      {isEditMode && <CardToolbar cardId={card.id} />}
      <div
        className="h-full w-full overflow-hidden"
        style={{ borderRadius: `${Math.max(0, borderRadius - 24)}px` }}
      >
        <Suspense fallback={<CardPlaceholder />}>
          <CardContent card={card} />
        </Suspense>
      </div>
      {isEditMode && !isAutoSize && <ResizeHandles onResizeStart={handleResizeStart} />}
    </motion.div>
  )
}
