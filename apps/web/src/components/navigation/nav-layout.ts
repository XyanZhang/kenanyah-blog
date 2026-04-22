export type InnerNavMode = 'rail' | 'topbar' | 'immersive'

const IMMERSIVE_ROUTE_PREFIXES = ['/ai-chat', '/works/pictures-3d'] as const

export function getInnerNavMode(pathname: string): InnerNavMode {
  if (IMMERSIVE_ROUTE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return 'immersive'
  }

  return 'rail'
}

export function isImmersiveNavRoute(pathname: string): boolean {
  return getInnerNavMode(pathname) === 'immersive'
}

export const INNER_NAV_SAFE_AREAS = {
  mobileTop: 92,
  desktopTop: 32,
  desktopLeft: 108,
  immersiveTop: 28,
  immersiveLeft: 0,
} as const

