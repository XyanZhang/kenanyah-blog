'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { TocHeading } from '@/lib/heading'
import { PostAside } from './PostAside'

type FixedPostAsideRailProps = {
  headings: TocHeading[]
  top?: number
  width?: number
}

type AsideBounds = {
  left: number
  width: number
}

export function FixedPostAsideRail({
  headings,
  top = 112,
  width,
}: FixedPostAsideRailProps) {
  const asideRef = useRef<HTMLElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const [bounds, setBounds] = useState<AsideBounds | null>(null)

  useLayoutEffect(() => {
    const aside = asideRef.current
    if (!aside) return

    const updateBounds = () => {
      const rect = aside.getBoundingClientRect()

      if (rect.width < 1) {
        setBounds(null)
        return
      }

      const nextBounds = {
        left: rect.left,
        width: width ?? rect.width,
      }

      setBounds((prev) => {
        if (
          prev &&
          Math.abs(prev.left - nextBounds.left) < 0.5 &&
          Math.abs(prev.width - nextBounds.width) < 0.5
        ) {
          return prev
        }
        return nextBounds
      })
    }

    const scheduleUpdate = () => {
      if (frameRef.current != null) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        updateBounds()
      })
    }

    scheduleUpdate()

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(aside)

    window.addEventListener('resize', scheduleUpdate)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [width])

  return (
    <aside
      ref={asideRef}
      data-skeleton="ignore"
      className="relative hidden xl:block xl:min-w-0"
      style={{ minHeight: '1px' }}
    >
      {bounds ? (
        <div
          className="fixed z-40"
          style={{
            top: `${top}px`,
            left: `${bounds.left}px`,
            width: `${bounds.width}px`,
          }}
        >
          <PostAside headings={headings} />
        </div>
      ) : null}
    </aside>
  )
}
