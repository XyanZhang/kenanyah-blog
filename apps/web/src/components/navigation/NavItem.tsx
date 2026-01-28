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
  isCompact?: boolean
  onMouseEnter: (element: HTMLElement) => void
}

export function NavItem({ item, isActive, isHovered, isCompact = false, onMouseEnter }: NavItemProps) {
  const IconComponent = iconMap[item.icon]

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center rounded-xl transition-all duration-300',
        isCompact ? 'justify-center p-2' : 'gap-3 px-3 py-2',
        isActive || isHovered
          ? 'text-accent-primary-dark'
          : 'text-content-tertiary'
      )}
      onMouseEnter={(e) => onMouseEnter(e.currentTarget)}
    >
      <IconComponent
        className={cn(
          'h-5 w-5 transition-all duration-300',
          isActive || isHovered
            ? 'text-accent-primary-dark fill-accent-primary-dark'
            : 'text-content-tertiary'
        )}
        style={{ viewTransitionName: `nav-icon-${item.id}` }}
      />

      <span
        className={cn(
          'text-sm font-medium transition-all duration-300',
          isCompact ? 'opacity-0 max-w-0 overflow-hidden' : 'opacity-100 max-w-32'
        )}
        style={{ viewTransitionName: `nav-label-${item.id}` }}
      >
        {item.label}
      </span>
    </Link>
  )
}
