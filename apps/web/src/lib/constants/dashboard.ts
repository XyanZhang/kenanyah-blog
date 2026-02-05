import { CardSize, CardDimensions } from '@blog/types'

export const CARD_DIMENSIONS: Record<string, CardDimensions> = {
  small: { width: 200, height: 200 },
  medium: { width: 300, height: 300 },
  large: { width: 400, height: 400 },
  wide: { width: 600, height: 300 },
  tall: { width: 300, height: 600 },
}

export const RESIZE_CONSTRAINTS = {
  minWidth: 0,
  minHeight: 0,
  maxWidth: 800,
  maxHeight: 800,
} as const

export function getCardDimensions(
  size: CardSize,
  customDimensions?: CardDimensions
): CardDimensions | null {
  if (size === CardSize.AUTO) {
    return null // auto size is determined by content
  }
  if (size === CardSize.CUSTOM && customDimensions) {
    return customDimensions
  }
  return CARD_DIMENSIONS[size] ?? CARD_DIMENSIONS.medium
}

export const DEFAULT_LAYOUT_CONFIG = {
  radius: 300,
  startAngle: 0,
} as const

export const STORAGE_KEY = 'dashboard-layout'
export const LAYOUT_VERSION = 1

export const DEFAULT_BORDER_RADIUS = 40
