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
export const LAYOUT_VERSION = 2
export const MOBILE_LAYOUT_BREAKPOINT = 480
export const TABLET_LAYOUT_BREAKPOINT = 1180
export const MOBILE_LAYOUT_SIDE_PADDING = 16
export const MOBILE_LAYOUT_TOP_PADDING = 24
export const MOBILE_LAYOUT_BOTTOM_PADDING = 32
export const MOBILE_LAYOUT_GAP = 16

/** Home 画布尺寸，左上角为坐标原点 (0,0) */
export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

export const DEFAULT_BORDER_RADIUS = 40
