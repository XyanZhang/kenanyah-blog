import { CardSize, type DashboardCard } from '@blog/types'
import { CARD_DIMENSIONS, getCardDimensions } from '@/lib/constants/dashboard'

export type DashboardLayoutMode = 'desktop' | 'tablet' | 'mobile'

export interface ResolvedCardLayout {
  x: number
  y: number
  width?: number
  height?: number
  zIndex: number
}

export interface StackedLayoutResult {
  layouts: Map<string, ResolvedCardLayout>
  contentHeight: number
  contentWidth: number
}

function getCardBaseDimensions(card: DashboardCard) {
  return getCardDimensions(card.size, card.customDimensions) ?? CARD_DIMENSIONS.medium
}

function getStackedCardDimensions(
  card: DashboardCard,
  containerWidth: number
) {
  const baseDimensions = getCardBaseDimensions(card)
  const resolvedWidth = Math.max(220, containerWidth)
  const resolvedHeight = baseDimensions.height

  switch (card.size) {
    case CardSize.SMALL:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
    case CardSize.MEDIUM:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
    case CardSize.LARGE:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
    case CardSize.WIDE:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
    case CardSize.TALL:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
    case CardSize.CUSTOM:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
    case CardSize.AUTO:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
    default:
      return {
        width: resolvedWidth,
        height: resolvedHeight,
      }
  }
}

export function getDesktopResolvedCardLayout(card: DashboardCard): ResolvedCardLayout {
  const dimensions = getCardBaseDimensions(card)

  return {
    x: card.position.x,
    y: card.position.y,
    width: dimensions.width,
    height: dimensions.height,
    zIndex: card.position.z,
  }
}

export function getStackedResolvedCardLayouts(
  cards: DashboardCard[],
  containerWidth: number,
  gap: number
): StackedLayoutResult {
  const layouts = new Map<string, ResolvedCardLayout>()
  let currentY = 0

  for (const card of cards) {
    const dimensions = getStackedCardDimensions(card, containerWidth)

    layouts.set(card.id, {
      x: 0,
      y: currentY,
      width: dimensions.width,
      height: dimensions.height,
      zIndex: card.position.z,
    })

    currentY += dimensions.height + gap
  }

  return {
    layouts,
    contentHeight: cards.length > 0 ? currentY - gap : 0,
    contentWidth: containerWidth,
  }
}
