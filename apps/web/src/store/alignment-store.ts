import { create } from 'zustand'

// 对齐检测阈值（像素）
const ALIGNMENT_THRESHOLD = 8

export interface ElementBounds {
  id: string
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

export interface AlignmentLine {
  type: 'horizontal' | 'vertical'
  position: number
  start: number
  end: number
}

interface AlignmentState {
  // 所有已注册的元素边界（使用屏幕坐标）
  elements: Map<string, ElementBounds>
  // 当前活动元素的 ID（正在拖拽或调整尺寸）
  activeId: string | null
  // 当前活动元素的实时边界（包含拖拽偏移）
  activeBounds: ElementBounds | null
  // 计算出的对齐线
  alignmentLines: AlignmentLine[]
  // 吸附偏移量
  snapOffset: { x: number; y: number } | null

  // Actions
  registerElement: (bounds: ElementBounds) => void
  unregisterElement: (id: string) => void
  setActiveElement: (id: string | null) => void
  updateActiveBounds: (bounds: ElementBounds) => void
}

function calculateAlignmentLines(
  activeBounds: ElementBounds,
  otherBounds: ElementBounds[]
): AlignmentLine[] {
  const lines: AlignmentLine[] = []

  for (const other of otherBounds) {
    // 垂直对齐检测（左边、右边、中心线）
    const verticalChecks = [
      { active: activeBounds.left, other: other.left },
      { active: activeBounds.left, other: other.right },
      { active: activeBounds.right, other: other.left },
      { active: activeBounds.right, other: other.right },
      { active: activeBounds.centerX, other: other.centerX },
    ]

    for (const check of verticalChecks) {
      const diff = Math.abs(check.active - check.other)
      if (diff < ALIGNMENT_THRESHOLD) {
        lines.push({
          type: 'vertical',
          position: check.other,
          start: Math.min(activeBounds.top, other.top),
          end: Math.max(activeBounds.bottom, other.bottom),
        })
      }
    }

    // 水平对齐检测（上边、下边、中心线）
    const horizontalChecks = [
      { active: activeBounds.top, other: other.top },
      { active: activeBounds.top, other: other.bottom },
      { active: activeBounds.bottom, other: other.top },
      { active: activeBounds.bottom, other: other.bottom },
      { active: activeBounds.centerY, other: other.centerY },
    ]

    for (const check of horizontalChecks) {
      const diff = Math.abs(check.active - check.other)
      if (diff < ALIGNMENT_THRESHOLD) {
        lines.push({
          type: 'horizontal',
          position: check.other,
          start: Math.min(activeBounds.left, other.left),
          end: Math.max(activeBounds.right, other.right),
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
}

function calculateSnapOffset(
  activeBounds: ElementBounds,
  alignmentLines: AlignmentLine[]
): { x: number; y: number } | null {
  if (alignmentLines.length === 0) return null

  let snapX: number | null = null
  let snapY: number | null = null

  // 找到最近的垂直对齐线
  for (const line of alignmentLines) {
    if (line.type === 'vertical') {
      const leftDiff = Math.abs(activeBounds.left - line.position)
      const rightDiff = Math.abs(activeBounds.right - line.position)
      const centerDiff = Math.abs(activeBounds.centerX - line.position)

      const minDiff = Math.min(leftDiff, rightDiff, centerDiff)
      if (minDiff < ALIGNMENT_THRESHOLD) {
        if (leftDiff === minDiff) {
          snapX = line.position - activeBounds.left
        } else if (rightDiff === minDiff) {
          snapX = line.position - activeBounds.right
        } else {
          snapX = line.position - activeBounds.centerX
        }
        break
      }
    }
  }

  // 找到最近的水平对齐线
  for (const line of alignmentLines) {
    if (line.type === 'horizontal') {
      const topDiff = Math.abs(activeBounds.top - line.position)
      const bottomDiff = Math.abs(activeBounds.bottom - line.position)
      const centerDiff = Math.abs(activeBounds.centerY - line.position)

      const minDiff = Math.min(topDiff, bottomDiff, centerDiff)
      if (minDiff < ALIGNMENT_THRESHOLD) {
        if (topDiff === minDiff) {
          snapY = line.position - activeBounds.top
        } else if (bottomDiff === minDiff) {
          snapY = line.position - activeBounds.bottom
        } else {
          snapY = line.position - activeBounds.centerY
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
}

export const useAlignmentStore = create<AlignmentState>((set, get) => ({
  elements: new Map(),
  activeId: null,
  activeBounds: null,
  alignmentLines: [],
  snapOffset: null,

  registerElement: (bounds) => {
    set((state) => {
      const newElements = new Map(state.elements)
      newElements.set(bounds.id, bounds)
      return { elements: newElements }
    })
  },

  unregisterElement: (id) => {
    set((state) => {
      const newElements = new Map(state.elements)
      newElements.delete(id)
      return { elements: newElements }
    })
  },

  setActiveElement: (id) => {
    if (id === null) {
      set({
        activeId: null,
        activeBounds: null,
        alignmentLines: [],
        snapOffset: null,
      })
    } else {
      set({ activeId: id })
    }
  },

  updateActiveBounds: (bounds) => {
    const { elements, activeId } = get()
    if (!activeId) return

    // 获取其他元素的边界（排除当前活动元素）
    const otherBounds = Array.from(elements.values()).filter(
      (el) => el.id !== activeId
    )

    // 计算对齐线和吸附偏移
    const alignmentLines = calculateAlignmentLines(bounds, otherBounds)
    const snapOffset = calculateSnapOffset(bounds, alignmentLines)

    set({
      activeBounds: bounds,
      alignmentLines,
      snapOffset,
    })
  },
}))
