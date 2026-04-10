export type NavHref = '/' | '/blog' | '/search' | '/about' | '/pictures' | '/projects' | '/works' | '/thoughts' | '/bookmarks'

/** 导航项展示用（来自配置或默认） */
export interface NavItem {
  id: string
  label: string
  href: NavHref
  icon: string
}

/** 导航配置中的一项（含可见性与排序，存库） */
export interface NavItemConfig {
  id: string
  label: string
  href: string
  icon: string
  visible: boolean
  sortOrder?: number
}

const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: '首页', href: '/', icon: 'Home', visible: true, sortOrder: 0 },
  { id: 'blog', label: '博客', href: '/blog', icon: 'FileText', visible: true, sortOrder: 1 },
  { id: 'search', label: '搜索', href: '/search', icon: 'Search', visible: true, sortOrder: 2 },
  { id: 'about', label: '关于', href: '/about', icon: 'User', visible: true, sortOrder: 3 },
  { id: 'pictures', label: '摄影', href: '/pictures', icon: 'Camera', visible: true, sortOrder: 4 },
  { id: 'projects', label: '项目', href: '/projects', icon: 'FolderOpen', visible: true, sortOrder: 5 },
  { id: 'works', label: '作品', href: '/works', icon: 'LayoutGrid', visible: true, sortOrder: 6 },
  { id: 'thoughts', label: '思考', href: '/thoughts', icon: 'MessageCircle', visible: true, sortOrder: 7 },
  { id: 'bookmarks', label: '收藏', href: '/bookmarks', icon: 'Bookmark', visible: true, sortOrder: 8 },
]

/** 默认导航项配置（用于新配置或旧数据迁移） */
export function getDefaultNavItemsConfig(): NavItemConfig[] {
  return DEFAULT_NAV_ITEMS.map((item) => ({ ...item }))
}

export function mergeNavItemsWithDefaults(items?: NavItemConfig[]): NavItemConfig[] {
  const defaults = getDefaultNavItemsConfig()
  if (!items?.length) {
    return defaults
  }

  const itemMap = new Map(items.map((item) => [item.id, item]))
  const merged = items.map((item) => {
    const defaultItem = defaults.find((candidate) => candidate.id === item.id)
    return defaultItem ? { ...defaultItem, ...item } : item
  })

  defaults.forEach((defaultItem) => {
    if (!itemMap.has(defaultItem.id)) {
      merged.push(defaultItem)
    }
  })

  return merged
}

/** 兼容旧代码：仅含 id/label/href/icon 的列表 */
export const navItems: NavItem[] = DEFAULT_NAV_ITEMS.map(
  ({ id, label, href, icon }) =>
    ({
      id,
      label,
      href: href as NavHref,
      icon,
    } satisfies NavItem)
)
