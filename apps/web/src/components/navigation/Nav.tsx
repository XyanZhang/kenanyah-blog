'use client'

import { useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NavItem } from './NavItem'
import { navItems } from './nav-items'

export function Nav() {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const navRef = useRef<HTMLElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({})

  const handleMouseEnter = useCallback(
    (index: number, element: HTMLElement) => {
      setHoverIndex(index)
      const rect = element.getBoundingClientRect()
      const navRect = navRef.current?.getBoundingClientRect()
      if (navRect) {
        setIndicatorStyle({
          width: rect.width,
          height: rect.height,
          transform: isHomepage
            ? `translateX(${rect.left - navRect.left - 8}px)`
            : `translateY(${rect.top - navRect.top - 8}px)`,
          opacity: 1,
        })
      }
    },
    [isHomepage]
  )

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
  }, [])

  return (
    <nav
      ref={navRef}
      className={cn(
        'fixed z-50 transition-all duration-500',
        'rounded-2xl bg-surface-glass backdrop-blur-lg',
        'border border-line-glass',
        '[box-shadow:0_20px_40px_-10px_rgba(0,0,0,0.1)]',
        isHomepage
          ? 'top-8 left-1/2 -translate-x-1/2 flex-row gap-1 p-2'
          : 'top-1/2 left-4 -translate-y-1/2 flex-col gap-1 p-2'
      )}
      style={{
        display: 'flex',
        flexDirection: isHomepage ? 'row' : 'column',
        viewTransitionName: 'main-nav',
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          'absolute rounded-xl bg-surface-primary shadow-sm transition-all duration-300 ease-out',
          hoverIndex === null && 'opacity-0'
        )}
        style={{
          ...indicatorStyle,
          pointerEvents: 'none',
        }}
      />
      {navItems.map((item, index) => (
        <NavItem
          key={item.id}
          item={item}
          isHorizontal={isHomepage}
          isActive={pathname === item.href}
          isHovered={hoverIndex === index}
          onMouseEnter={(el) => handleMouseEnter(index, el)}
        />
      ))}
    </nav>
  )
}
