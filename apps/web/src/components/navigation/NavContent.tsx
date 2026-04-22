'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { NavItem } from './NavItem'
import type { NavItem as NavItemType } from './nav-items'

const NAV_INDICATOR_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.75,
}

interface NavContentProps {
  avatarSrc: string
  items: NavItemType[]
  pathname: string
  layoutMode: 'home' | 'rail' | 'topbar'
  isEditMode: boolean
  onItemHover: (index: number) => void
  onMouseLeave: () => void
}

export function NavContent({
  avatarSrc,
  items,
  pathname,
  layoutMode,
  isEditMode,
  onItemHover,
  onMouseLeave,
}: NavContentProps) {
  const navItemsRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [indicatorRect, setIndicatorRect] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    opacity: 0,
  })

  const isHomeLayout = layoutMode === 'home'
  const isCompact = layoutMode !== 'home'
  const isTopbar = layoutMode === 'topbar'
  const highlightedIndex = hoverIndex ?? items.findIndex((item) => item.href === pathname)

  useEffect(() => {
    setHoverIndex(null)
  }, [pathname])

  useLayoutEffect(() => {
    const container = navItemsRef.current
    if (!container || highlightedIndex < 0) {
      setIndicatorRect((current) => (current.opacity === 0 ? current : { ...current, opacity: 0 }))
      return
    }

    const target = container.querySelector<HTMLElement>(`[data-nav-item-index="${highlightedIndex}"]`)
    if (!target) {
      setIndicatorRect((current) => (current.opacity === 0 ? current : { ...current, opacity: 0 }))
      return
    }

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const nextRect = {
      x: targetRect.left - containerRect.left,
      y: targetRect.top - containerRect.top,
      width: targetRect.width,
      height: targetRect.height,
      opacity: 1,
    }

    setIndicatorRect((current) => {
      if (
        Math.abs(current.x - nextRect.x) < 0.5 &&
        Math.abs(current.y - nextRect.y) < 0.5 &&
        Math.abs(current.width - nextRect.width) < 0.5 &&
        Math.abs(current.height - nextRect.height) < 0.5 &&
        current.opacity === nextRect.opacity
      ) {
        return current
      }

      return nextRect
    })
  }, [highlightedIndex, items.length, layoutMode, pathname])

  useEffect(() => {
    const container = navItemsRef.current
    if (!container) return

    const updateIndicator = () => {
      if (highlightedIndex < 0) return
      const target = container.querySelector<HTMLElement>(`[data-nav-item-index="${highlightedIndex}"]`)
      if (!target) return

      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      setIndicatorRect({
        x: targetRect.left - containerRect.left,
        y: targetRect.top - containerRect.top,
        width: targetRect.width,
        height: targetRect.height,
        opacity: 1,
      })
    }

    const observer = new ResizeObserver(updateIndicator)
    observer.observe(container)
    Array.from(container.children).forEach((child) => observer.observe(child))

    return () => {
      observer.disconnect()
    }
  }, [highlightedIndex, items.length, layoutMode])

  return (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center',
          isTopbar
            ? 'mr-2 gap-2 border-r border-line-glass pr-3'
            : isHomeLayout
              ? 'mb-2 flex-col gap-2 border-b border-line-glass pb-3'
              : 'mb-2 flex-col gap-2 border-b border-line-glass pb-3'
        )}
      >
        <div>
          <Image
            src={avatarSrc}
            alt="Kenanyah"
            width={48}
            height={48}
            className={cn('rounded-full', isHomeLayout ? '' : 'mr-0')}
          />
        </div>

        {isHomeLayout ? (
          <span className="text-sm font-medium text-content-primary">Kenanyah</span>
        ) : null}
      </div>

      <div
        ref={navItemsRef}
        data-nav-items
        className={cn(
          'relative flex min-w-0 flex-1 overflow-hidden',
          isTopbar
            ? 'flex-row items-center justify-start gap-0'
            : isHomeLayout
              ? 'min-w-30 flex-col justify-center gap-1'
              : 'flex-col items-center gap-1'
        )}
        onMouseLeave={onMouseLeave}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute rounded-xl bg-accent-primary-light"
          animate={indicatorRect}
          transition={NAV_INDICATOR_SPRING}
          style={{
            left: 0,
            top: 0,
            willChange: 'transform, width, height, opacity',
          }}
        />

        {items.map((item, index) => (
          <NavItem
            key={item.id}
            index={index}
            item={item}
            isActive={pathname === item.href}
            isHighlighted={highlightedIndex === index}
            isCompact={isCompact}
            onMouseEnter={() => {
              if (isEditMode) return
              setHoverIndex(index)
              onItemHover(index)
            }}
          />
        ))}
      </div>
    </>
  )
}
