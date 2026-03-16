'use client'

import Link from 'next/link'
import { Home, FileText, Search, User, Camera, FolderOpen, LayoutGrid, MessageCircle, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem as NavItemType } from './nav-items'

const iconMap: Record<string, LucideIcon> = {
  Home,
  FileText,
  Search,
  User,
  Camera,
  FolderOpen,
  LayoutGrid,
  MessageCircle,
}

interface NavItemProps {
  item: NavItemType
  isActive: boolean
  isHovered: boolean
  isAnyHovered: boolean
  isCompact?: boolean
  onMouseEnter: (element: HTMLElement) => void
}

export function NavItem({ item, isActive, isHovered, isAnyHovered, isCompact = false, onMouseEnter }: NavItemProps) {
  const IconComponent = iconMap[item.icon]
  const shouldHighlight = isAnyHovered ? isHovered : isActive
  const isExternal = item.href.startsWith('http://') || item.href.startsWith('https://')

  const content = (
    <>
      <IconComponent
        className={cn(
          'h-5 w-5 transition-colors duration-150 ease-out',
          shouldHighlight
            ? 'text-accent-primary-dark fill-accent-primary-dark'
            : 'text-content-tertiary'
        )}
        style={{ viewTransitionName: `nav-icon-${item.id}` }}
      />
      <span
        className={cn(
          'text-sm font-medium transition-colors duration-150 ease-out',
          shouldHighlight ? '' : 'text-accent-primary',
          isCompact ? 'opacity-0 max-w-0 overflow-hidden' : 'opacity-1000'
        )}
        style={{ viewTransitionName: `nav-label-${item.id}` }}
      >
        {item.label}
      </span>
    </>
  )

  if (isExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group relative flex justify-center items-center rounded-xl transition-colors duration-150 ease-out',
          isCompact ? 'justify-center p-2' : 'gap-3 px-3 py-2',
          shouldHighlight
            ? 'text-accent-primary-dark'
            : 'text-content-tertiary'
        )}
        onMouseEnter={(e) => onMouseEnter(e.currentTarget)}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex justify-center items-center rounded-xl transition-colors duration-150 ease-out',
        isCompact ? 'justify-center p-2' : 'gap-3 px-3 py-2',
        shouldHighlight
          ? 'text-accent-primary-dark'
          : 'text-content-tertiary'
      )}
      onMouseEnter={(e) => onMouseEnter(e.currentTarget)}
    >
      {content}
    </Link>
  )
}
