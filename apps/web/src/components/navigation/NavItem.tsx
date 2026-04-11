'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { motion } from 'framer-motion'
import { Home, FileText, Search, User, Camera, FolderOpen, LayoutGrid, MessageCircle, Bookmark, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem as NavItemType } from './nav-items'

const prefetchedHrefs = new Set<string>()

const iconMap: Record<string, LucideIcon> = {
  Home,
  FileText,
  Search,
  User,
  Camera,
  FolderOpen,
  LayoutGrid,
  MessageCircle,
  Bookmark,
}

const NAV_INDICATOR_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.75,
}

const NAV_ITEM_LAYOUT_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
  mass: 0.82,
}

interface NavItemProps {
  item: NavItemType
  isActive: boolean
  isHighlighted: boolean
  isCompact?: boolean
  onMouseEnter: () => void
}

export function NavItem({
  item,
  isActive,
  isHighlighted,
  isCompact = false,
  onMouseEnter,
}: NavItemProps) {
  const IconComponent = iconMap[item.icon]
  const isExternal = item.href.startsWith('http://') || item.href.startsWith('https://')

  const handleMouseEnter = () => {
    onMouseEnter()
    if (!isExternal) {
      if (prefetchedHrefs.has(item.href)) {
        return
      }

      void fetch(item.href, {
        method: 'GET',
        cache: 'force-cache',
        keepalive: true,
      }).catch(() => {
        // Ignore prefetch failures so normal navigation stays unaffected.
      })

      prefetchedHrefs.add(item.href)
    }
  }

  const baseClassName = cn(
    'group relative flex items-center overflow-hidden rounded-xl',
    isCompact ? 'justify-center p-2' : 'gap-3 px-3 py-2',
    isHighlighted ? 'text-accent-primary-dark' : 'text-content-tertiary'
  )

  const content = (
    <>
      {isHighlighted ? (
        <motion.div
          layoutId="main-nav-indicator"
          className="absolute inset-0 rounded-xl bg-accent-primary-light"
          transition={NAV_INDICATOR_SPRING}
        />
      ) : null}

      <div className={cn('relative z-10 flex items-center', isCompact ? 'justify-center' : 'gap-3')}>
        <IconComponent
          className={cn(
            'h-5 w-5 transition-colors duration-150 ease-out',
            isHighlighted
              ? 'fill-accent-primary-dark text-accent-primary-dark'
              : 'text-content-tertiary'
          )}
        />

        {!isCompact ? (
          <span
            className={cn(
              'whitespace-nowrap text-sm font-medium transition-colors duration-150 ease-out',
              isHighlighted ? 'text-accent-primary-dark' : 'text-accent-primary'
            )}
          >
            {item.label}
          </span>
        ) : null}
      </div>
    </>
  )

  if (isExternal) {
    return (
      <motion.div layout="position" transition={NAV_ITEM_LAYOUT_SPRING} className="relative">
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClassName}
          onMouseEnter={handleMouseEnter}
          onFocus={handleMouseEnter}
        >
          {content}
        </a>
      </motion.div>
    )
  }

  return (
    <motion.div layout="position" transition={NAV_ITEM_LAYOUT_SPRING} className="relative">
      <Link
        href={item.href as Route}
        className={baseClassName}
        onMouseEnter={handleMouseEnter}
        onFocus={handleMouseEnter}
        onNavigate={isActive ? (event) => event.preventDefault() : undefined}
      >
        {content}
      </Link>
    </motion.div>
  )
}
