'use client'

import { motion, type Transition } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NavShellProps {
  shellClassName: string
  shellX: number
  shellY: number
  isReady: boolean
  isDragging: boolean
  animateShell: boolean
  transition: {
    layout: Transition
    x: Transition
    y: Transition
    opacity: Transition
    scale: Transition
  }
  navClassName?: string
  navStyle: React.CSSProperties
  navRef: React.RefObject<HTMLElement | null>
  onPointerDown?: React.PointerEventHandler<HTMLElement>
  children: React.ReactNode
}

export function NavShell({
  shellClassName,
  shellX,
  shellY,
  isReady,
  isDragging,
  animateShell,
  transition,
  navClassName,
  navStyle,
  navRef,
  onPointerDown,
  children,
}: NavShellProps) {
  return (
    <motion.div
      initial={false}
      animate={{
        x: shellX,
        y: shellY,
        opacity: isReady ? 1 : 0,
        scale: isDragging ? 0.985 : 1,
      }}
      transition={transition}
      className={shellClassName}
      style={{
        willChange: animateShell ? 'transform, opacity' : undefined,
        backfaceVisibility: 'hidden',
      }}
    >
      <nav
        ref={navRef}
        className={cn(
          'group rounded-2xl bg-surface-glass backdrop-blur-lg',
          'border border-line-glass',
          '[box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1)]',
          navClassName
        )}
        style={navStyle}
        onPointerDown={onPointerDown}
      >
        {children}
      </nav>
    </motion.div>
  )
}
