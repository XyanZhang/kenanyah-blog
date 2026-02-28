export type NavHref = '/' | '/blog' | '/search' | '/about' | '/pictures' | '/projects' | '/works' | '/thoughts'

export interface NavItem {
  id: string
  label: string
  href: NavHref
  icon: string
}

export const navItems: NavItem[] = [
  { id: 'home', label: '首页', href: '/', icon: 'Home' },
  { id: 'blog', label: '博客', href: '/blog', icon: 'FileText' },
  { id: 'search', label: '搜索', href: '/search', icon: 'Search' },
  { id: 'about', label: '关于', href: '/about', icon: 'User' },
  { id: 'pictures', label: '摄影', href: '/pictures', icon: 'Camera' },
  { id: 'projects', label: '项目', href: '/projects', icon: 'FolderOpen' },
  { id: 'works', label: '作品', href: '/works', icon: 'LayoutGrid' },
  { id: 'thoughts', label: '思考', href: '/thoughts', icon: 'MessageCircle' },
]
