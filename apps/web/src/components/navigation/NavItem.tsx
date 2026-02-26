'use client'

import Link from 'next/link'
import { Home, FileText, User, Camera, FolderOpen, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem as NavItemType } from './nav-items'

const iconMap: Record<string, LucideIcon> = {
  Home,
  FileText,
  User,
  Camera,
  FolderOpen,
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
  // When any item is hovered, only the hovered item should be highlighted
  // When nothing is hovered, the active item should be highlighted
  const shouldHighlight = isAnyHovered ? isHovered : isActive

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
    </Link>
  )
}
