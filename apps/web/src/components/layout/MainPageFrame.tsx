'use client'

import { usePathname } from 'next/navigation'
import { getInnerNavMode, INNER_NAV_SAFE_AREAS } from '@/components/navigation/nav-layout'

export function MainPageFrame({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const navMode = getInnerNavMode(pathname)
  const isImmersive = navMode === 'immersive'

  return (
    <div
      data-inner-nav-mode={navMode}
      className={
        isImmersive
          ? 'relative h-screen overflow-hidden'
          : 'relative min-h-screen pt-[var(--page-top-safe-area-mobile)] md:pt-[var(--page-top-safe-area-desktop)] md:pl-[var(--page-left-safe-area-desktop)]'
      }
      style={
        {
          '--page-top-safe-area-mobile': `${isImmersive ? INNER_NAV_SAFE_AREAS.immersiveTop : INNER_NAV_SAFE_AREAS.mobileTop}px`,
          '--page-top-safe-area-desktop': `${isImmersive ? INNER_NAV_SAFE_AREAS.immersiveTop : INNER_NAV_SAFE_AREAS.desktopTop}px`,
          '--page-left-safe-area-desktop': `${isImmersive ? INNER_NAV_SAFE_AREAS.immersiveLeft : INNER_NAV_SAFE_AREAS.desktopLeft}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
