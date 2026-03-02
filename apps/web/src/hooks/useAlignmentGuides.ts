import { useMemo } from 'react'
import { DashboardCard } from '@blog/types'
import { getCardDimensions } from '@/lib/constants/dashboard'

// 对齐检测阈值（像素）
const ALIGNMENT_THRESHOLD = 8

export interface AlignmentLine {
  type: 'horizontal' | 'vertical'
  position: number
  start: number
  end: number
}

interface CardBounds {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
}

function getCardBounds(card: DashboardCard): CardBounds | null {
  const dimensions = getCardDimensions(card.size, card.customDimensions)
  if (!dimensions) return null

  const left = card.position.x
  const top = card.position.y
  const right = left + dimensions.width
  const bottom = top + dimensions.height

  return {
    left,
    right,
    top,
    bottom,
    centerX: left + dimensions.width / 2,
    centerY: top + dimensions.height / 2,
  }
}

export interface ResizeState {
  width: number
  height: number
  positionDelta: { x: number; y: number }
}

interface UseAlignmentGuidesProps {
  cards: DashboardCard[]
  activeCardId: string | null
  dragDelta: { x: number; y: number }
  resizeState?: ResizeState | null
}

interface UseAlignmentGuidesResult {
  alignmentLines: AlignmentLine[]
  snapOffset: { x: number; y: number } | null
}

export function useAlignmentGuides({
  cards,
  activeCardId,
  dragDelta,
  resizeState,
}: UseAlignmentGuidesProps): UseAlignmentGuidesResult {
  // 计算其他卡片的边界（排除当前拖拽的卡片）
  const otherCardsBounds = useMemo(() => {
    return cards
      .filter((card) => card.id !== activeCardId && card.visible)
      .map(getCardBounds)
      .filter((bounds): bounds is CardBounds => bounds !== null)
  }, [cards, activeCardId])

  // 计算当前拖拽/调整尺寸卡片的边界
  const activeCardBounds = useMemo(() => {
    if (!activeCardId) return null
    const activeCard = cards.find((card) => card.id === activeCardId)
    if (!activeCard) return null

    // 如果正在调整尺寸，使用 resizeState 计算边界
    if (resizeState) {
      const left = activeCard.position.x + resizeState.positionDelta.x
      const top = activeCard.position.y + resizeState.positionDelta.y
      const right = left + resizeState.width
      const bottom = top + resizeState.height
      return {
        left,
        right,
        top,
        bottom,
        centerX: left + resizeState.width / 2,
        centerY: top + resizeState.height / 2,
      }
    }

    // 否则使用拖拽偏移
    const bounds = getCardBounds(activeCard)
    if (!bounds) return null

    return {
      left: bounds.left + dragDelta.x,
      right: bounds.right + dragDelta.x,
      top: bounds.top + dragDelta.y,
      bottom: bounds.bottom + dragDelta.y,
      centerX: bounds.centerX + dragDelta.x,
      centerY: bounds.centerY + dragDelta.y,
    }
  }, [cards, activeCardId, dragDelta, resizeState])

  // 计算对齐线
  const alignmentLines = useMemo(() => {
    if (!activeCardBounds || otherCardsBounds.length === 0) {
      return []
    }

    const lines: AlignmentLine[] = []

    for (const other of otherCardsBounds) {
      // 垂直对齐检测（左边、右边、中心线）
      const verticalChecks = [
        { active: activeCardBounds.left, other: other.left },
        { active: activeCardBounds.left, other: other.right },
        { active: activeCardBounds.right, other: other.left },
        { active: activeCardBounds.right, other: other.right },
        { active: activeCardBounds.centerX, other: other.centerX },
      ]

      for (const check of verticalChecks) {
        const diff = Math.abs(check.active - check.other)
        if (diff < ALIGNMENT_THRESHOLD) {
          lines.push({
            type: 'vertical',
            position: check.other,
            start: Math.min(activeCardBounds.top, other.top),
            end: Math.max(activeCardBounds.bottom, other.bottom),
          })
        }
      }

      // 水平对齐检测（上边、下边、中心线）
      const horizontalChecks = [
        { active: activeCardBounds.top, other: other.top },
        { active: activeCardBounds.top, other: other.bottom },
        { active: activeCardBounds.bottom, other: other.top },
        { active: activeCardBounds.bottom, other: other.bottom },
        { active: activeCardBounds.centerY, other: other.centerY },
      ]

      for (const check of horizontalChecks) {
        const diff = Math.abs(check.active - check.other)
        if (diff < ALIGNMENT_THRESHOLD) {
          lines.push({
            type: 'horizontal',
            position: check.other,
            start: Math.min(activeCardBounds.left, other.left),
            end: Math.max(activeCardBounds.right, other.right),
          })
        }
      }
    }

    // 去重：相同类型和位置的线只保留一条
    return lines.reduce<AlignmentLine[]>((acc, line) => {
      const exists = acc.some(
        (l) => l.type === line.type && Math.abs(l.position - line.position) < 1
      )
      if (!exists) {
        acc.push(line)
      }
      return acc
    }, [])
  }, [activeCardBounds, otherCardsBounds])

  // 计算吸附偏移量
  const snapOffset = useMemo(() => {
    if (!activeCardBounds || otherCardsBounds.length === 0 || alignmentLines.length === 0) {
      return null
    }

    let snapX: number | null = null
    let snapY: number | null = null

    // 找到最近的垂直对齐线
    for (const line of alignmentLines) {
      if (line.type === 'vertical') {
        const leftDiff = Math.abs(activeCardBounds.left - line.position)
        const rightDiff = Math.abs(activeCardBounds.right - line.position)
        const centerDiff = Math.abs(activeCardBounds.centerX - line.position)

        const minDiff = Math.min(leftDiff, rightDiff, centerDiff)
        if (minDiff < ALIGNMENT_THRESHOLD) {
          // 计算需要的偏移量
          if (leftDiff === minDiff) {
            snapX = line.position - activeCardBounds.left
          } else if (rightDiff === minDiff) {
            snapX = line.position - activeCardBounds.right
          } else {
            snapX = line.position - activeCardBounds.centerX
          }
          break
        }
      }
    }

    // 找到最近的水平对齐线
    for (const line of alignmentLines) {
      if (line.type === 'horizontal') {
        const topDiff = Math.abs(activeCardBounds.top - line.position)
        const bottomDiff = Math.abs(activeCardBounds.bottom - line.position)
        const centerDiff = Math.abs(activeCardBounds.centerY - line.position)

        const minDiff = Math.min(topDiff, bottomDiff, centerDiff)
        if (minDiff < ALIGNMENT_THRESHOLD) {
          // 计算需要的偏移量
          if (topDiff === minDiff) {
            snapY = line.position - activeCardBounds.top
          } else if (bottomDiff === minDiff) {
            snapY = line.position - activeCardBounds.bottom
          } else {
            snapY = line.position - activeCardBounds.centerY
          }
          break
        }
      }
    }

    if (snapX !== null || snapY !== null) {
      return {
        x: snapX ?? 0,
        y: snapY ?? 0,
      }
    }

    return null
  }, [activeCardBounds, otherCardsBounds, alignmentLines])

  return { alignmentLines, snapOffset }
}
