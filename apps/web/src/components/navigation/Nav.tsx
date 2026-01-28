'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NavItem } from './NavItem'
import { navItems } from './nav-items'

export function Nav() {
  const pathname = usePathname()
  const isHomepage = pathname === '/'

  return (
    <nav
      className={cn(
        'fixed z-50 transition-all duration-500',
        'rounded-2xl bg-white/80 backdrop-blur-lg',
        'border border-white/50',
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
    >
      {navItems.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          isHorizontal={isHomepage}
          isActive={pathname === item.href}
        />
      ))}
    </nav>
  )
}
