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
  isHorizontal: boolean
  isActive: boolean
}

export function NavItem({ item, isHorizontal, isActive }: NavItemProps) {
  const IconComponent = iconMap[item.icon]

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-2 rounded-xl transition-all duration-300',
        isHorizontal ? 'flex-col justify-center px-4 py-3' : 'flex-row justify-center p-3',
        isActive
          ? 'bg-white text-purple-600 shadow-sm'
          : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
      )}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-blue-100"
        style={{ viewTransitionName: `nav-icon-${item.id}` }}
      >
        <IconComponent className="h-5 w-5" />
      </div>

      <span
        className={cn(
          'text-sm font-medium transition-all duration-300',
          isHorizontal
            ? 'opacity-100 max-h-6 mt-1'
            : 'opacity-0 max-h-0 overflow-hidden absolute pointer-events-none'
        )}
        style={{ viewTransitionName: `nav-label-${item.id}` }}
      >
        {item.label}
      </span>
    </Link>
  )
}
