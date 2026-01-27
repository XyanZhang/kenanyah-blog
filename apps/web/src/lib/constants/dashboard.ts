import { CardSize } from '@blog/types'

export const CARD_DIMENSIONS = {
  small: { width: 200, height: 200 },
  medium: { width: 300, height: 300 },
  large: { width: 400, height: 400 },
  wide: { width: 600, height: 300 },
  tall: { width: 300, height: 600 },
} as const

export function getCardDimensions(size: CardSize) {
  return CARD_DIMENSIONS[size]
}

export const DEFAULT_LAYOUT_CONFIG = {
  radius: 300,
  startAngle: 0,
} as const

export const STORAGE_KEY = 'dashboard-layout'
export const LAYOUT_VERSION = 1
