'use client'

import { type ResizeDirection } from '@/hooks/useResize'

interface ResizeHandlesProps {
  onResizeStart: (direction: ResizeDirection, e: React.PointerEvent) => void
}

const EDGE_SIZE = 8
const CORNER_SIZE = 14

interface HandleConfig {
  direction: ResizeDirection
  style: React.CSSProperties
  cursor: string
}

function getHandleConfigs(): HandleConfig[] {
  return [
    // Edges
    {
      direction: 'n',
      cursor: 'ns-resize',
      style: { top: -EDGE_SIZE / 2, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_SIZE },
    },
    {
      direction: 's',
      cursor: 'ns-resize',
      style: { bottom: -EDGE_SIZE / 2, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_SIZE },
    },
    {
      direction: 'e',
      cursor: 'ew-resize',
      style: { right: -EDGE_SIZE / 2, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_SIZE },
    },
    {
      direction: 'w',
      cursor: 'ew-resize',
      style: { left: -EDGE_SIZE / 2, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_SIZE },
    },
    // Corners
    {
      direction: 'nw',
      cursor: 'nwse-resize',
      style: { top: -CORNER_SIZE / 2, left: -CORNER_SIZE / 2, width: CORNER_SIZE, height: CORNER_SIZE },
    },
    {
      direction: 'ne',
      cursor: 'nesw-resize',
      style: { top: -CORNER_SIZE / 2, right: -CORNER_SIZE / 2, width: CORNER_SIZE, height: CORNER_SIZE },
    },
    {
      direction: 'sw',
      cursor: 'nesw-resize',
      style: { bottom: -CORNER_SIZE / 2, left: -CORNER_SIZE / 2, width: CORNER_SIZE, height: CORNER_SIZE },
    },
    {
      direction: 'se',
      cursor: 'nwse-resize',
      style: { bottom: -CORNER_SIZE / 2, right: -CORNER_SIZE / 2, width: CORNER_SIZE, height: CORNER_SIZE },
    },
  ]
}

const HANDLE_CONFIGS = getHandleConfigs()

const isCorner = (direction: ResizeDirection) =>
  direction === 'nw' || direction === 'ne' || direction === 'sw' || direction === 'se'

export function ResizeHandles({ onResizeStart }: ResizeHandlesProps) {
  return (
    <>
      {HANDLE_CONFIGS.map(({ direction, style, cursor }) => (
        <div
          key={direction}
          onPointerDown={(e) => onResizeStart(direction, e)}
          style={{
            ...style,
            position: 'absolute',
            cursor,
            zIndex: 20,
          }}
          className={`
            transition-opacity duration-150
            ${
              isCorner(direction)
                ? 'rounded-full border-2 border-line-focus bg-surface-primary opacity-0 group-hover:opacity-100'
                : 'opacity-0 hover:bg-line-focus/30 group-hover:opacity-100'
            }
          `}
        />
      ))}
    </>
  )
}
